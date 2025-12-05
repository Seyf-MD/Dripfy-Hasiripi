import * as ftp from 'basic-ftp'

async function download() {
    const client = new ftp.Client()
    client.ftp.verbose = true // Log progress
    try {
        await client.access({
            host: "ftp.hasiripi.com",
            user: "siteadmin@hasiripi.com",
            password: "ceswo4-dexnyw-vatkeD",
            secure: false
        })
        console.log("Connected to FTP. Starting download into ./hasiripi_backup...")
        // attempt to list first to see where we are
        const list = await client.list()
        console.log("Root content:", list.map(f => f.name))

        // Download entire root. might be huge. 
        // Usually web content is in public_html or similar. 
        // If I see public_html, I should probably prefer downloading that, but downloading / ensures I get it all.
        // Let's settle for downloading "/" for now as requested.
        await client.downloadToDir("./hasiripi_backup", "/")
        console.log("Download complete")
    }
    catch (err) {
        console.error("FTP Error:", err)
    }
    client.close()
}

download()
