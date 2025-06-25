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
    // API Key is now hardcoded for convenience.
    const apiKey = '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';


    const generateImage = async () => {
        if (!apiKey) {
            setError("The OpenAI API key is missing from the code.");
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
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "dall-e-3", // Using the DALL-E 3 model
                    prompt: prompt,
                    n: 1, // OpenAI currently only supports n=1 for dall-e-3
                    size: "1024x1024",
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
            }

            const result = await response.json();

            if (result.data && result.data[0] && result.data[0].url) {
                setImageUrl(result.data[0].url);
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
        // Since OpenAI returns a URL, we need to fetch it and create a blob to download it.
        // This can be blocked by CORS policies. A simpler way is to open it in a new tab.
        window.open(imageUrl, '_blank');
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center font-sans p-4">
            <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                <h1 className="text-4xl font-bold text-center mb-2 text-blue-400">Image Generator</h1>
                <p className="text-center text-gray-400 mb-8">Powered by OpenAI DALL-E 3</p>

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
                        disabled={loading} 
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
                            <p>Your generated image will appear here.</p>
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
