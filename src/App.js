import React, { useState } from 'react';

// =================================================================
// --- MAIN APP COMPONENT ---
// =================================================================
const App = () => {
    const [prompt, setPrompt] = useState('A photorealistic image of a woman with long, dark wavy hair in a blue one-piece swimsuit, standing in a well-lit room, smiling at the camera.');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generationHistory, setGenerationHistory] = useState([]);
    const [upscaledImageUrl, setUpscaledImageUrl] = useState(null);
    const [apiKey, setApiKey] = useState('');


    const generateImage = async () => {
        if (!apiKey) {
            setError("Please enter your DeepAI API key above.");
            return;
        }
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }

        if (imageUrl) {
            setGenerationHistory(prev => [imageUrl, ...prev]);
        }
        
        setLoading(true);
        setError(null);
        setImageUrl('');

        try {
            // Use FormData for this API as it's more robust
            const formData = new FormData();
            formData.append('text', prompt);

            const response = await fetch('https://api.deepai.org/api/text2img', {
                method: 'POST',
                headers: {
                    'api-key': apiKey,
                },
                body: formData
            });

            if (!response.ok) {
                // Try to parse the error for a more helpful message
                const errorData = await response.json().catch(() => null);
                if (response.status === 401) {
                     throw new Error('Unauthorized: Please check if your API key is correct.');
                }
                throw new Error(errorData?.err || `API request failed with status ${response.status}`);
            }

            const result = await response.json();

            if (result.output_url) {
                setImageUrl(result.output_url);
            } else {
                throw new Error('Image URL not found in the API response.');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleBack = () => {
        if (generationHistory.length === 0) return;
        const newHistory = [...generationHistory];
        const lastGeneration = newHistory.shift();
        setImageUrl(lastGeneration);
        setGenerationHistory(newHistory);
    };

    const downloadImage = () => {
        // Due to CORS policy, direct download is not possible.
        // We open the image in a new tab for the user to save.
        window.open(imageUrl, '_blank');
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center font-sans p-4">
            <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                <h1 className="text-4xl font-bold text-center mb-2 text-blue-400">Image Generator</h1>
                <p className="text-center text-gray-400 mb-8">Create stunning visuals with a simple text prompt.</p>

                 <div className="bg-gray-700/50 p-4 rounded-lg mb-8 border border-blue-500/30">
                    <h2 className="text-lg font-bold text-white mb-2">Setup Required: Add Your API Key</h2>
                    <p className="text-sm text-gray-300 mb-3">To power this app, you need a free API key from DeepAI. Paste it below to enable image generation.</p>
                    <div className="flex items-center gap-2">
                        <input
                            id="api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Paste your DeepAI API key here"
                            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        <a href="https://deepai.org/signup" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">Click here to get your free key from DeepAI.</a>
                    </p>
                </div>

                <div className="mb-6">
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Describe the image you want to create:</label>
                    <textarea 
                        id="prompt" 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder="e.g., A majestic lion in a field of flowers"
                        className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                </div>

                <div className="flex gap-4 mb-6">
                    <button 
                        onClick={generateImage} 
                        disabled={loading || !apiKey} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                    >
                        {loading ? 'Generating...' : 'Generate Image'}
                    </button>
                     <button 
                        onClick={handleBack} 
                        disabled={generationHistory.length === 0 || loading} 
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                    >
                        Back
                    </button>
                </div>

                {error && ( <div className="p-4 mb-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center"><p><strong>Error:</strong> {error}</p></div> )}

                <div className="min-h-[300px] flex items-center justify-center bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 p-4">
                    {loading ? (
                         <div className="text-center text-gray-400">
                            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500 mx-auto mb-4"></div>
                            <p>Conjuring up your image...</p>
                        </div>
                    ) : imageUrl ? (
                        <div className="relative group w-full h-full">
                            <img src={imageUrl} alt="Generated visual" className="w-full h-full object-contain rounded-xl" />
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                <div className="flex gap-4">
                                    <button onClick={() => setUpscaledImageUrl(imageUrl)} className="bg-white/90 text-black font-bold py-2 px-5 rounded-lg hover:bg-white">View Full Size</button>
                                    <button onClick={downloadImage} className="bg-white/90 text-black font-bold py-2 px-5 rounded-lg hover:bg-white">Save</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center text-gray-500">
                            {!apiKey ? <p>Please add your API key above to start.</p> : <p>Your generated image will appear here.</p>}
                        </div>
                    )}
                </div>
            </div>
            
            {upscaledImageUrl && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setUpscaledImageUrl(null)}>
                    <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
                        <img src={upscaledImageUrl} alt="Upscaled view" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                        <button onClick={() => setUpscaledImageUrl(null)} className="absolute -top-3 -right-3 bg-white text-black w-8 h-8 rounded-full text-xl font-bold flex items-center justify-center hover:scale-110">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
