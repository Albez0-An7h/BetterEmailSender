import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    try {
        // Extract email data from request
        const { to, subject, html, text } = req.body;

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ error: 'Missing required email fields' });
        }

        // Configure email transport
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Verify connection configuration
        try {
            await transporter.verify();
        } catch (verifyError) {
            console.error('Email configuration error:', verifyError);
            return res.status(500).json({
                error: 'Failed to connect to email service',
                details: verifyError.message
            });
        }

        // Send email with better error handling
        try {
            const info = await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to,
                subject,
                text: text || '',
                html: html || '',
            });

            console.log('Email sent:', info.messageId);
            return res.status(200).json({ success: true, messageId: info.messageId });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            return res.status(500).json({
                error: 'Failed to send email',
                details: emailError.message
            });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            error: 'Unexpected error occurred',
            details: error.message
        });
    }
}
