import { readCollection, writeCollection } from './storageService.js';
import { randomUUID } from 'crypto';

export async function getMessagesForUser(userId, role) {
    const messages = await readCollection('messages');
    return messages.filter(m => {
        // Own messages (sent or received)
        if (m.fromId === userId || m.toId === userId) return true;

        // If user is admin, they can see messages sent to 'admin'
        if (role === 'admin' && m.toId === 'admin') return true;

        // If user is admin, they can also see messages SENT by 'admin' (if they want to see team replies)
        // For now let's stick to seeing messages directed to admin.

        return false;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function getAllMessages() {
    const messages = await readCollection('messages');
    return messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function sendMessage({ fromId, fromName, toId, content, subject, parentId }) {
    const messages = await readCollection('messages');
    const newMessage = {
        id: randomUUID(),
        fromId,
        fromName,
        toId,
        content,
        subject,
        parentId,
        timestamp: new Date().toISOString(),
        isRead: false,
        isResolved: false
    };
    messages.push(newMessage);
    await writeCollection('messages', messages);
    return newMessage;
}

export async function markMessageAsRead(messageId) {
    const messages = await readCollection('messages');
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
        messages[index].isRead = true;
        await writeCollection('messages', messages);
        return true;
    }
    return false;
}

export async function markMessageAsResolved(messageId) {
    const messages = await readCollection('messages');
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
        messages[index].isResolved = true;
        await writeCollection('messages', messages);
        return true;
    }
    return false;
}
