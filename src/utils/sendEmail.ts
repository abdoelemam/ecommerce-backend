import { Resend } from "resend";

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

export const sendEmail = async ({ to, subject, html, attachments }: EmailOptions) => {
    // Lazy initialization ensures dotenv has loaded the env variables
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 1. Send email using Resend
    const data = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>", // Replace with your verified domain in production e.g. "EcommercePro <orders@yourdomain.com>"
        to: [to],
        subject,
        html,
        attachments: attachments?.map(att => ({
            filename: att.filename,
            content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
            contentType: att.contentType
        }))
    });

    if (data.error) {
        console.error("Resend error:", data.error);
        throw new Error(data.error.message);
    }

    return data;
};
