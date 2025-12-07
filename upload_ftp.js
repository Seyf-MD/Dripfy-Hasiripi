
import { Client } from 'basic-ftp';
import dotenv from 'dotenv';
dotenv.config();

const FTP_HOST = 'ftp.hasiripi.com';
const FTP_USER = 'siteadmin@hasiripi.com';
const FTP_PASS = process.env.FTP_PASS; // Read from environment variable

if (!FTP_PASS) {
    console.error("Error: FTP_PASS environment variable is not set.");
    process.exit(1);
}

async function upload() {
    const client = new Client();
    client.ftp.verbose = true;

    try {
        console.log(`Connecting to ${FTP_HOST} as ${FTP_USER}...`);
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false // Explicitly requested plain or the server doesn't support implicit TLS on 21 well
        });

        console.log('Connected!');

        console.log('Uploading dist to /public_html...');
        await client.ensureDir('/public_html');
        // We will upload contents of dist to public_html
        await client.uploadFromDir('dist', '/public_html');

        console.log('Upload complete!');
    } catch (err) {
        console.error('Upload failed:', err);
        process.exit(1);
    } finally {
        client.close();
    }
}

upload();
