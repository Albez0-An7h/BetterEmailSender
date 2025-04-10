const nodemailer = require('nodemailer');

// Configure email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { to, toName, from, fromName, subject, content } = req.body;

    if (!to || !from || !content) {
      return res.status(400).json({ message: 'Missing required email fields' });
    }

    const transporter = createTransporter();

    // Send email
    const mailOptions = {
      from: `"${fromName}" <${from}>`,
      to: `"${toName}" <${to}>`,
      subject: subject,
      html: content.replace(/\n/g, '<br>'), // Convert newlines to HTML line breaks
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);

    res.status(200).json({ 
      message: 'Email sent successfully', 
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      message: 'Failed to send email', 
      error: error.message 
    });
  }
}
