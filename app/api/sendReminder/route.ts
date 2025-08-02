// File: app/api/sendReminder/route.ts
import { NextResponse } from 'next/server'

interface ReminderPayload {
    chatId: string
    title: string
    body: string
}

export async function POST(request: Request) {
    const { chatId, title, body } = (await request.json()) as ReminderPayload

    const token = process.env.TELEGRAM_TOKEN
    if (!token) {
        return NextResponse.json({ error: 'TELEGRAM_TOKEN не задан' }, { status: 500 })
    }

    try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `🔔 *${title}*\n${body}`,
                parse_mode: 'Markdown',
            }),
        })

        if (!resp.ok) {
            const err = await resp.json()
            throw new Error(JSON.stringify(err))
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Ошибка при отправке в Telegram:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}