import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    try {
        // Log all email-related environment variables (without exposing passwords)
        const configSummary = {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE,
            user: process.env.SMTP_USER,
            hasPassword: !!process.env.SMTP_PASSWORD,
        };

        console.log('Email configuration:', configSummary);

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        // Verify connection
        try {
            await transporter.verify();
            return res.status(200).json({
                success: true,
                message: 'Email configuration is valid',
                config: configSummary
            });
        } catch (verifyError) {
            return res.status(500).json({
                success: false,
                message: 'Email configuration is invalid',
                error: verifyError.message,
                config: configSummary
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to verify email configuration',
            error: error.message
        });
    }
}
