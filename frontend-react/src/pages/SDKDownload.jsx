import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FiDownload, FiFolder, FiCode } from 'react-icons/fi';

const CodeBlock = ({ children, title }) => (
    <div className="my-4 rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
        {title && (
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400 font-mono">
                {title}
            </div>
        )}
        <div className="p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">
                <code>{children}</code>
            </pre>
        </div>
    </div>
);

const SDKDownload = () => {
    const handleDownload = () => {
        // Trigger download of the zip file from public folder
        const link = document.createElement('a');
        link.href = '/waterbase-sdk.zip';
        link.download = 'waterbase-sdk.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Tải xuống SDK</h1>
                    <p className="text-gray-400">Tải xuống thủ công và tích hợp SDK vào dự án của bạn.</p>
                </div>

                <Card className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">Waterbase SDK (JavaScript)</h2>
                            <p className="text-gray-400 text-sm">Phiên bản 3.0.0 • File ZIP • Bao gồm mã nguồn đầy đủ</p>
                        </div>
                        <Button onClick={handleDownload} size="lg">
                            <FiDownload className="mr-2" />
                            Tải xuống .zip
                        </Button>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold text-white mb-6">Hướng dẫn tích hợp thủ công</h2>

                    <div className="space-y-8">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold mr-4 border border-blue-700">
                                1
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-white mb-2">Giải nén và Copy</h3>
                                <p className="text-gray-400 mb-3">
                                    Giải nén file <code>waterbase-sdk.zip</code> vừa tải về. Copy thư mục <code>waterbase-sdk</code> vào thư mục dự án của bạn (ví dụ: trong <code>src/</code>).
                                </p>
                                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center text-sm text-gray-300">
                                    <FiFolder className="mr-2 text-yellow-500" />
                                    src/
                                    <span className="mx-2 text-gray-600">/</span>
                                    <FiFolder className="mr-2 text-blue-500" />
                                    waterbase-sdk/
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold mr-4 border border-blue-700">
                                2
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-white mb-2">Cài đặt dependencies</h3>
                                <p className="text-gray-400 mb-3">
                                    SDK yêu cầu một số thư viện phụ thuộc. Hãy cài đặt chúng qua npm:
                                </p>
                                <CodeBlock title="Terminal">
                                    npm install axios socket.io-client
                                </CodeBlock>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold mr-4 border border-blue-700">
                                3
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-white mb-2">Import và Sử dụng</h3>
                                <p className="text-gray-400 mb-3">
                                    Import SDK từ thư mục local thay vì từ <code>node_modules</code>.
                                </p>
                                <CodeBlock title="src/config/waterbase.js">
                                    {`// Import từ thư mục local
import Waterbase from '../waterbase-sdk'; 

const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_API_KEY',
    debug: true
});

export default waterbase;`}
                                </CodeBlock>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default SDKDownload;
