
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersPath = path.join(__dirname, 'server/data/users.json');

async function debugLogin() {
    console.log("Reading users from:", usersPath);
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

    const email = 'dripfy@hasiripi.com';
    const password = 'fykciw-9busgI-nosgem';

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        console.log("User not found!");
        return;
    }

    console.log("User found:", user.email);
    console.log("Stored Hash:", user.passwordHash);

    try {
        const match = await bcrypt.compare(password, user.passwordHash);
        console.log("Password match result:", match);

        if (!match) {
            console.log("Generating new hash for verification...");
            const newHash = await bcrypt.hash(password, 10);
            console.log("New Hash:", newHash);

            // Verifying the new hash immediately
            const matchNew = await bcrypt.compare(password, newHash);
            console.log("Match against new hash:", matchNew);
        }
    } catch (err) {
        console.error("Error comparing:", err);
    }
}

debugLogin();
