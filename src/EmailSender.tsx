import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Footer from './Footer';

interface CompanyData {
    companyName: string;
    ceoName: string;
    keywords: string;
    email: string;
}

interface EmailStatus {
    companyName: string;
    email: string;
    status: 'pending' | 'sent' | 'failed';
    error?: string;
    content?: string; // Store the generated email content
}

const EmailSender = () => {
    const [senderEmail, setSenderEmail] = useState('');
    const [senderName, setSenderName] = useState('');
    const [csvData, setCsvData] = useState<CompanyData[]>([]);
    const [emailStatuses, setEmailStatuses] = useState<EmailStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const [selectedEmail, setSelectedEmail] = useState<EmailStatus | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSenderEmail(e.target.value);
    };

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSenderName(e.target.value);
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        setErrorMessage('');
        const file = e.target.files?.[0];

        if (!file) {
            setErrorMessage('No file selected');
            return;
        }

        setSelectedFileName(file.name);

        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension !== 'csv') {
            setErrorMessage('Please upload a file with .csv extension');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    console.log('CSV Parse Results:', results);

                    if (results.errors && results.errors.length > 0) {
                        console.error('CSV parsing errors:', results.errors);
                        setErrorMessage(`CSV parsing error: ${results.errors[0].message}`);
                        return;
                    }

                    const parsedData = results.data as Record<string, string>[];
                    console.log('Raw parsed data:', parsedData);

                    if (parsedData.length === 0) {
                        setErrorMessage('The CSV file appears to be empty. Please check the file and try again.');
                        return;
                    }

                    const firstRow = parsedData[0];
                    const headers = Object.keys(firstRow);
                    console.log('CSV headers:', headers);

                    const requiredColumns = ['companyName', 'email'];
                    const missingColumns = requiredColumns.filter(col =>
                        !headers.some(header => header.toLowerCase() === col.toLowerCase())
                    );

                    if (missingColumns.length > 0) {
                        setErrorMessage(`Missing required columns in CSV: ${missingColumns.join(', ')}. Your CSV has these columns: ${headers.join(', ')}`);
                        return;
                    }

                    const getColumn = (row: Record<string, string>, columnName: string): string => {
                        const key = Object.keys(row).find(k => k.toLowerCase() === columnName.toLowerCase());
                        return key ? row[key] : '';
                    };

                    const formattedData: CompanyData[] = parsedData
                        .filter(row => getColumn(row, 'companyName') && getColumn(row, 'email'))
                        .map(row => ({
                            companyName: getColumn(row, 'companyName'),
                            ceoName: getColumn(row, 'ceoName'),
                            keywords: getColumn(row, 'keywords'),
                            email: getColumn(row, 'email')
                        }));

                    console.log('Formatted data:', formattedData);

                    if (formattedData.length === 0) {
                        setErrorMessage('No valid data found in CSV. Please ensure your CSV has at least one row with company name and email.');
                        return;
                    }

                    setCsvData(formattedData);

                    setEmailStatuses(formattedData.map(company => ({
                        companyName: company.companyName,
                        email: company.email,
                        status: 'pending'
                    })));

                } catch (error) {
                    console.error('Error processing CSV file:', error);
                    setErrorMessage(`Error parsing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            },
            error: (error) => {
                console.error('Papa parse error:', error);
                setErrorMessage(`Error parsing CSV file: ${error.message}`);
            }
        });
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const generateEmailContent = async (companyData: CompanyData) => {
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

            if (!apiKey) {
                throw new Error('Gemini API key is not configured. Please add it to your .env file.');
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            // Update to use the correct model name with appropriate API version
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

            const prompt = `
            Write a professional and personalized email to the CEO of a company with the following details:
            - Company name: ${companyData.companyName}
            - CEO name: ${companyData.ceoName}
            - Company keywords/industry: ${companyData.keywords}
            - Sender email: ${senderEmail}

            I am Akashat Singh from IITD, representing trabii, an event and weekend travel booking company.
            The email should be friendly, professional, and express interest in potential collaboration opportunities.
            Mention how our event planning and weekend travel booking services could benefit their company.
            Keep it concise (just one paragraph) and make it feel personalized to the company.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            return text;
        } catch (error) {
            console.error('Error generating email content with Gemini:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to generate email content');
        }
    };

    const sendEmails = async (e: FormEvent) => {
        e.preventDefault();

        if (!senderEmail) {
            setErrorMessage('Please enter your email address');
            return;
        }

        if (!senderName) {
            setErrorMessage('Please enter your name');
            return;
        }

        if (csvData.length === 0) {
            setErrorMessage('Please upload a CSV file with company data. If you already uploaded a file, ensure it contains valid data with company name and email columns.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        // API endpoint that works both locally and on Vercel
        const apiEndpoint = '/api/send-email';

        for (let i = 0; i < csvData.length; i++) {
            const company = csvData[i];

            setEmailStatuses(prev =>
                prev.map((status, idx) =>
                    idx === i ? { ...status, status: 'pending' } : status
                )
            );

            try {
                const emailContent = await generateEmailContent(company);
                
                // Prepare the email data to send to the backend
                const emailData = {
                    to: company.email,
                    toName: company.ceoName || company.companyName,
                    from: senderEmail,
                    fromName: senderName,
                    subject: `Collaboration Opportunity with ${company.companyName}`,
                    content: emailContent
                };

                // Call backend API to send the email
                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emailData),
                });

                if (!response.ok) {
                    // Improved error handling from response
                    let errorMessage = 'Failed to send email';
                    let errorDetails = '';
                    
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                        errorDetails = errorData.error || `HTTP error ${response.status}`;
                        console.error('Server error details:', errorData);
                    } catch (jsonError) {
                        errorDetails = `HTTP error ${response.status}: ${response.statusText}`;
                    }
                    
                    throw new Error(`${errorMessage}: ${errorDetails}`);
                }
                
                // Safely parse successful response
                let result;
                try {
                    result = await response.json();
                } catch (jsonError) {
                    console.warn('Could not parse success response as JSON', jsonError);
                    result = { message: 'Email likely sent but response could not be parsed' };
                }
                
                console.log('Email sent successfully:', result);
                
                setEmailStatuses(prev =>
                    prev.map((status, idx) =>
                        idx === i ? { 
                            ...status, 
                            status: 'sent', 
                            content: emailContent 
                        } : status
                    )
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
                console.error(`Email sending failed for ${company.companyName}:`, error);
                
                setEmailStatuses(prev =>
                    prev.map((status, idx) =>
                        idx === i ? { 
                            ...status, 
                            status: 'failed', 
                            error: `Failed to send email: ${errorMessage}` 
                        } : status
                    )
                );
            }
        }

        setIsLoading(false);
    };

    const viewEmailContent = (status: EmailStatus) => {
        setSelectedEmail(status);
    };

    const closeEmailContent = () => {
        setSelectedEmail(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-[#0B192C] min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-white relative pb-3 inline-block after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-[#FF6500] after:rounded tracking-wide">
                <span className="bg-gradient-to-r from-white to-[#1E3E62] text-transparent bg-clip-text">Email Sender</span>
            </h1>

            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorMessage}
                </div>
            )}

            <form onSubmit={sendEmails} className="mb-8">
                <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-white mb-1">
                        Your Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={senderName}
                        onChange={handleNameChange}
                        className="w-full px-3 py-2 border border-[#1E3E62] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6500] bg-[#000000] text-white placeholder-gray-400"
                        placeholder="Your Name"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                        Your Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={senderEmail}
                        onChange={handleEmailChange}
                        className="w-full px-3 py-2 border border-[#1E3E62] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6500] bg-[#000000] text-white placeholder-gray-400"
                        placeholder="your@email.com"
                        required
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="csvFile" className="block text-sm font-medium text-white mb-2">
                        Upload CSV File (with columns: companyName, ceoName, keywords, email)
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <input
                            type="file"
                            id="csvFile"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className="px-4 py-2 rounded-md text-white bg-[#1E3E62] hover:bg-[#0B192C] hover:shadow-[0_0_10px_#1E3E62] transition-all flex items-center justify-center border border-[#1E3E62]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Choose CSV File
                        </button>
                        <div className={`rounded-md px-3 py-2 overflow-hidden text-ellipsis ${selectedFileName ? 'bg-[#000000] border border-[#1E3E62] text-white' : 'bg-[#000000] border border-[#1E3E62] text-gray-400'}`}>
                            {selectedFileName || 'No file selected'}
                        </div>
                    </div>
                    <p className="text-xs text-[#FF6500]/80 mt-2">
                        File must be a CSV with columns for company name, CEO name, keywords, and email
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-md text-white ${isLoading 
                        ? 'bg-[#1E3E62] opacity-70 cursor-not-allowed' 
                        : 'bg-[#FF6500] hover:bg-[#FF6500]/80'}`}
                >
                    {isLoading ? 'Sending Emails...' : 'Send Emails'}
                </button>
            </form>

            <div className="border border-[#1E3E62] rounded-md bg-[#000000]">
                <h2 className="text-xl font-semibold p-4 border-b border-[#1E3E62] text-white bg-[#0B192C]">Email Status</h2>

                {emailStatuses.length > 0 ? (
                    <div className="divide-y divide-[#1E3E62]">
                        {emailStatuses.map((status, index) => (
                            <div key={index} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-white">{status.companyName}</p>
                                    <p className="text-sm text-gray-300">{status.email}</p>
                                    {status.error && (
                                        <p className="text-xs text-red-400 mt-1">{status.error}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {status.status === 'pending' && (
                                        <span className="bg-[#0B192C] text-white py-1 px-3 rounded-full text-sm border border-[#1E3E62]">
                                            Pending
                                        </span>
                                    )}
                                    {status.status === 'sent' && (
                                        <>
                                            <span className="bg-[#FF6500]/20 text-[#FF6500] py-1 px-3 rounded-full text-sm">
                                                Sent
                                            </span>
                                            {status.content && (
                                                <button 
                                                    onClick={() => viewEmailContent(status)}
                                                    className="text-sm text-[#FF6500] underline"
                                                >
                                                    View
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {status.status === 'failed' && (
                                        <span className="bg-red-100 text-red-800 py-1 px-3 rounded-full text-sm">
                                            Failed
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="p-4 text-gray-300">No emails to display. Upload a CSV file to get started.</p>
                )}
            </div>

            {/* Email content modal */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#0B192C] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto border border-[#1E3E62]">
                        <div className="p-4 border-b border-[#1E3E62] flex justify-between items-center">
                            <h3 className="text-lg font-medium text-white">
                                Email to: {selectedEmail.companyName}
                            </h3>
                            <button 
                                onClick={closeEmailContent}
                                className="text-gray-300 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 whitespace-pre-wrap">
                            <div className="p-3 bg-[#000000] rounded mb-2 border border-[#1E3E62]">
                                <p className="text-sm text-white"><strong>To:</strong> {selectedEmail.email}</p>
                                <p className="text-sm text-white"><strong>From:</strong> {senderEmail}</p>
                            </div>
                            <div className="text-gray-300">{selectedEmail.content}</div>
                        </div>
                    </div>
                </div>
            )}
                <Footer/>
        </div>
    );
};

export default EmailSender;
