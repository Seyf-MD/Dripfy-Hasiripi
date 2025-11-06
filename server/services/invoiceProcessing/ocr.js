function normaliseDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function toCurrency(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalised = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalised);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseTextFallback(text) {
  if (!text) {
    return {};
  }
  const vendorMatch = text.match(/(?:Vendor|Company|Supplier)[:\s]+([\w\s.-]+)/i);
  const invoiceMatch = text.match(/Invoice\s*(?:No\.|Number)?[:\s-]*([A-Z0-9-]+)/i);
  const totalMatch = text.match(/Total\s*(?:Due|Amount)?[:\s]*([0-9.,]+)/i);
  const currencyMatch = text.match(/(?:EUR|USD|GBP|TRY)/);
  const dueDateMatch = text.match(/Due\s*Date[:\s-]*([0-9.\/-]+)/i);
  const issueDateMatch = text.match(/(?:Issue|Invoice)\s*Date[:\s-]*([0-9.\/-]+)/i);

  return {
    vendorName: vendorMatch ? vendorMatch[1].trim() : null,
    invoiceNumber: invoiceMatch ? invoiceMatch[1].trim() : null,
    totalAmount: totalMatch ? toCurrency(totalMatch[1]) : null,
    currency: currencyMatch ? currencyMatch[0] : null,
    dueDate: dueDateMatch ? normaliseDate(dueDateMatch[1]) : null,
    issueDate: issueDateMatch ? normaliseDate(issueDateMatch[1]) : null,
  };
}

async function pollAzureOperation({ url, apiKey, maxAttempts = 10, intervalMs = 1500 }) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Azure polling failed with status ${response.status}`);
    }

    const payload = await response.json();
    const status = payload.status || payload.analyzeResult?.status;

    if (!status || status.toLowerCase() === 'succeeded') {
      return payload.analyzeResult || payload;
    }

    if (status.toLowerCase() === 'failed') {
      const message = payload.error?.message || payload.errors?.[0]?.message || 'Azure Form Recognizer reported failure';
      throw new Error(message);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Azure Form Recognizer timed out');
}

function parseAzureResult(result) {
  const documents = result?.documents;
  const doc = Array.isArray(documents) ? documents[0] : null;
  const fields = doc?.fields || {};

  const lineItems = Array.isArray(fields.Items?.valueArray)
    ? fields.Items.valueArray.map((item) => ({
      description: item?.valueObject?.Description?.value || null,
      quantity: item?.valueObject?.Quantity?.value || null,
      unitPrice: item?.valueObject?.UnitPrice?.value || null,
      amount: item?.valueObject?.Amount?.value || null,
    }))
    : [];

  return {
    vendorName: fields.VendorName?.content || fields.VendorName?.value || null,
    vendorAddress: fields.VendorAddress?.content || fields.VendorAddress?.value || null,
    invoiceNumber: fields.InvoiceId?.value || fields.InvoiceId?.content || null,
    purchaseOrder: fields.PurchaseOrder?.value || null,
    issueDate: normaliseDate(fields.InvoiceDate?.value || fields.InvoiceDate?.content),
    dueDate: normaliseDate(fields.DueDate?.value || fields.DueDate?.content),
    totalAmount: toCurrency(fields.InvoiceTotal?.value || fields.InvoiceTotal?.content),
    taxAmount: toCurrency(fields.TaxTotal?.value || fields.TaxTotal?.content),
    currency: fields.InvoiceTotal?.currency || fields.InvoiceTotal?.valueCurrency || null,
    lineItems,
    confidence: typeof doc?.confidence === 'number' ? doc.confidence : null,
    rawFields: fields,
  };
}

async function extractWithAzure({ buffer, mimeType }) {
  const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
  const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
  if (!endpoint || !apiKey) {
    throw new Error('Azure Form Recognizer is not configured');
  }
  const modelId = process.env.AZURE_FORM_RECOGNIZER_MODEL_ID || 'prebuilt-invoice';
  const apiVersion = process.env.AZURE_FORM_RECOGNIZER_API_VERSION || '2023-07-31';
  const url = `${endpoint.replace(/\/$/, '')}/formrecognizer/documentModels/${modelId}:analyze?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure analyze request failed: ${response.status} - ${errorText}`);
  }

  const operationLocation = response.headers.get('operation-location');
  if (!operationLocation) {
    throw new Error('Azure analyze request missing operation location header');
  }

  const result = await pollAzureOperation({ url: operationLocation, apiKey });
  return parseAzureResult(result);
}

function parseGoogleAnnotations(response) {
  const text = response?.responses?.[0]?.fullTextAnnotation?.text
    || response?.responses?.[0]?.textAnnotations?.[0]?.description
    || '';
  const fallback = parseTextFallback(text);

  return {
    ...fallback,
    rawText: text,
  };
}

async function extractWithGoogleVision({ buffer }) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('Google Vision API key not configured');
  }
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  const base64 = buffer.toString('base64');
  const payload = {
    requests: [
      {
        image: { content: base64 },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' },
        ],
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Vision request failed: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return parseGoogleAnnotations(data);
}

export async function extractInvoiceFields({ buffer, mimeType }) {
  const preferredProvider = (process.env.INVOICE_OCR_PROVIDER || '').toLowerCase();
  const strategies = [];

  if (preferredProvider === 'azure' || (!preferredProvider && process.env.AZURE_FORM_RECOGNIZER_ENDPOINT)) {
    strategies.push(async () => ({ provider: 'azure', result: await extractWithAzure({ buffer, mimeType }) }));
  }
  if (preferredProvider === 'google' || (!preferredProvider && process.env.GOOGLE_VISION_API_KEY)) {
    strategies.push(async () => ({ provider: 'google', result: await extractWithGoogleVision({ buffer }) }));
  }

  strategies.push(async () => ({ provider: 'fallback', result: parseTextFallback(buffer.toString('utf8')) }));

  for (const strategy of strategies) {
    try {
      const { provider, result } = await strategy();
      if (result) {
        return { provider, fields: result };
      }
    } catch (error) {
      console.warn('[invoice-ocr] strategy failed', error);
    }
  }

  return { provider: 'none', fields: {} };
}
