import nodemailer from "nodemailer";

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
    // 1. Create a transporter
    const transporter = nodemailer.createTransport({
        service: "gmail", // You can use other services here
        auth: {
            user: process.env.EMAIL_SERVICE_USER,
            pass: process.env.EMAIL_SERVICE_PASS,
        },
    });

    // 2. Define email options
    const mailOptions = {
        from: `"EcommercePro Team" <${process.env.EMAIL_SERVICE_USER}>`,
        to,
        subject,
        html,
        attachments,
    };

    // 3. Send email
    const info = await transporter.sendMail(mailOptions);
    return info;
};
