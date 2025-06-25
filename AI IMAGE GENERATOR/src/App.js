import React, { useState, useEffect } from 'react';

// --- HELPER FUNCTIONS ---
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return await response.blob();
};


// =================================================================
// --- MAIN APP COMPONENT ---
// =================================================================
const App = () => {
    const [prompt, setPrompt] = useState('A woman with long, dark wavy hair in a blue one-piece swimsuit, standing in a well-lit room, smiling at the camera.');
    const [referenceImages, setReferenceImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [imageUrls, setImageUrls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [upscaledImageUrl, setUpscaledImageUrl] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [generationHistory, setGenerationHistory] = useState([]);

    const handleImageChange = async (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).slice(0, 4 - previewUrls.length);
            const base64Promises = files.map(file => toBase64(file));
            const newBase64Images = await Promise.all(base64Promises);
            const newPreviewUrls = files.map(file => URL.createObjectURL(file));
            setReferenceImages(prev => [...prev, ...newBase64Images]);
            setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        }
    };
    
    const handleAnalysisImageChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsAnalyzing(true);
            setError(null);
            setAnalysisResult(null);

            try {
                const base64Image = await toBase64(file);
                const apiKey = "";

                const visionPrompt = `
                    You are a professional photographic analyst. Your task is to perform a forensic-level analysis of the provided image and generate a highly precise, detailed, and structured description. This description must be so accurate that an AI image generator can replicate the image with 100% fidelity.

                    Break down your analysis into the following strict components:
                    - **Subject Description:** Meticulously detail every facial feature, expression, eye color, hair style/color/texture, age, ethnicity, and body type.
                    - **Clothing & Attire:** Describe every single item of clothing, including its material (e.g., cotton, silk, denim), texture, color, pattern, and fit. Detail all accessories like jewelry, watches, or glasses.
                    - **Pose & Composition:** Precisely describe the subject's pose, including the angle of the head, position of limbs, and body language. Detail the camera's shot type (e.g., close-up, medium shot, full-body shot), angle, and the compositional rules applied (e.g., rule of thirds).
                    - **Lighting & Atmosphere:** Analyze the lighting setup. Is it soft, hard, natural, or studio lighting? Identify the key light, fill light, and backlight. Describe the color temperature of the light and the mood it creates.
                    - **Environment/Setting:** Describe the background and foreground in detail. Identify the location, objects, colors, and textures.
                    - **Artistic Style:** Specify the overall style (e.g., photorealistic, cinematic, vintage, dramatic portrait) and the camera settings that likely produced this look (e.g., shallow depth of field, high contrast).

                    Synthesize these structured points into a single, comprehensive, and highly descriptive paragraph. This is the final and only output you should provide.
                `;

                const visionParts = [{ text: visionPrompt }, { inlineData: { mimeType: file.type, data: base64Image } }];
                const visionPayload = { contents: [{ role: "user", parts: visionParts }] };
                const visionApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                const visionResponse = await fetch(visionApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visionPayload) });
                if (!visionResponse.ok) throw new Error('Failed to analyze image.');
                
                const visionText = await visionResponse.text();
                if (!visionText) {
                    throw new Error("Analysis API returned an empty response.");
                }
                const visionResult = JSON.parse(visionText);

                const description = visionResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis could not be completed.';
                setAnalysisResult(description);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const removeImage = (indexToRemove) => {
        URL.revokeObjectURL(previewUrls[indexToRemove]);
        setReferenceImages(prev => prev.filter((_, index) => index !== indexToRemove));
        setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const downloadImage = (url, index) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `generated-variation-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = async (imageUrl) => {
        setLoading(true);
        setLoadingMessage('Analyzing image for editing...');
        setError(null);
        setImageUrls([]); // Clear old results to show loading indicator

        // Clean up old object URLs
        previewUrls.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url)
            }
        });

        try {
            const blob = await dataUrlToBlob(imageUrl);
            const base64 = await toBase64(blob);
            
            // Set the new reference image
            setReferenceImages([base64]);
            setPreviewUrls([imageUrl]); // Use the data URL for preview as it's already loaded

            const apiKey = "";
            const visionPrompt = `Analyze this image in detail. Describe the subject, clothing, setting, lighting, and artistic style. Create a descriptive paragraph that could be used to generate a similar image.`;
            const visionParts = [{ text: visionPrompt }, { inlineData: { mimeType: "image/png", data: base64 } }];
            const visionPayload = { contents: [{ role: "user", parts: visionParts }] };
            const visionApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const visionResponse = await fetch(visionApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visionPayload) });
            if (!visionResponse.ok) throw new Error('Failed to analyze image for editing.');

            const visionText = await visionResponse.text();
            if (!visionText) throw new Error("Analysis API returned an empty response.");
            
            const visionResult = JSON.parse(visionText);
            const description = visionResult.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate a prompt. Please describe the image manually.';
            
            setPrompt(description); // Set the generated description as the new prompt

        } catch (err) {
            setError(err.message);
            setPrompt("Analysis failed. Please describe the image and your desired changes.");
        } finally {
            setLoading(false);
            setLoadingMessage('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const generateImage = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        
        if (imageUrls.length > 0) {
            setGenerationHistory(prev => [imageUrls, ...prev]);
        }

        setLoading(true);
        setError(null);
        setImageUrls([]);

        try {
            const apiKey = "";
            let finalPromptForImagen;
            const negativePrompt = "Avoid: cartoon, 3d render, anime, painting, watermark, text, signature, low quality, blurry, deformed, disfigured, ugly, noise.";

            setLoadingMessage('Summarizing your creative vision...');
            
            // Step 1: Combine all inputs into a single "master prompt"
            let masterPrompt = prompt;
            if (referenceImages.length > 0) {
                 const visionPrompt = `Based on the style and subject of the reference image(s), create an image that incorporates the following request: ${prompt}`;
                 masterPrompt = visionPrompt; // In this case, the vision prompt becomes the master. You could also combine them.
            }

            // Step 2: Use a language model to distill the master prompt into a clean, effective prompt for Imagen.
            const summarizerPrompt = `You are an expert prompt engineer. Summarize the following user request into a concise, highly descriptive paragraph suitable for an AI image generator. Focus on the key visual elements: subject, action, clothing, setting, and style. The user's request is: "${masterPrompt}"`;

            const summarizerPayload = { contents: [{ role: "user", parts: [{ text: summarizerPrompt }] }] };
            const summarizerApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const summarizerResponse = await fetch(summarizerApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summarizerPayload) });
            if (!summarizerResponse.ok) throw new Error('Failed to summarize the prompt.');

            const summarizerText = await summarizerResponse.text();
            if (!summarizerText) throw new Error("Summarizer API returned an empty response.");

            const summarizerResult = JSON.parse(summarizerText);
            const summarizedPrompt = summarizerResult.candidates?.[0]?.content?.parts?.[0]?.text || masterPrompt; // Fallback to master prompt

            finalPromptForImagen = `A photorealistic, highly detailed image of: ${summarizedPrompt}. ${negativePrompt}`;
            
            console.log("Final prompt being sent to API:", finalPromptForImagen);

            // Step 3: Generate the image using the distilled prompt.
            setLoadingMessage('Generating high-precision images...');
            const imagePayload = { instances: [{ prompt: finalPromptForImagen }], parameters: { "sampleCount": 4 } };
            const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            const imageResponse = await fetch(imageApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imagePayload) });
            if (!imageResponse.ok) {
                 const errorText = await imageResponse.text();
                 try {
                     const errorJson = JSON.parse(errorText);
                     throw new Error(errorJson.error?.message || 'Failed to generate images.');
                 } catch(e) {
                     throw new Error('Failed to generate images. Received non-JSON response.');
                 }
            }
            
            const imageText = await imageResponse.text();
             if (!imageText) {
                throw new Error("Image generation API returned an empty response.");
            }
            const imageResult = JSON.parse(imageText);
            
            if (imageResult.predictions && imageResult.predictions.length > 0 && imageResult.predictions[0].bytesBase64Encoded) {
                const newImageUrls = imageResult.predictions.map(pred => `data:image/png;base64,${pred.bytesBase64Encoded}`);
                setImageUrls(newImageUrls);
                
                if (newImageUrls.length < 4) {
                     setError(`The AI returned ${newImageUrls.length} image(s) instead of 4. This can happen with complex prompts or due to safety filters.`);
                }

            } else {
                if (imageResult.promptFeedback?.blockReason) throw new Error(`Image generation blocked. Reason: ${imageResult.promptFeedback.blockReason}.`);
                if (Object.keys(imageResult).length === 0) throw new Error('The image generator returned an empty response. This may be due to the prompt being too long or complex. Try simplifying your request or using fewer reference images.');
                throw new Error('Image data not found in the API response.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleBack = () => {
        if (generationHistory.length === 0) return;
        const newHistory = [...generationHistory];
        const lastGeneration = newHistory.shift();
        setImageUrls(lastGeneration);
        setGenerationHistory(newHistory);
    };
    
    const handleCopy = () => {
        const textArea = document.createElement('textarea');
        textArea.value = analysisResult;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center font-sans p-4">
            <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
                <h1 className="text-4xl font-bold text-center mb-2 text-blue-400">Image Generator</h1>
                <p className="text-center text-gray-400 mb-8">Create stunning visuals with enhanced precision.</p>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Reference Images</label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {previewUrls.map((url, index) => (
                                    <div key={url} className="relative group aspect-square">
                                        <img src={url} alt={`Ref ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                        <button onClick={() => removeImage(index)} className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">&times;</button>
                                    </div>
                                ))}
                                {previewUrls.length < 4 && (
                                    <div className="w-full h-full aspect-square border-2 border-dashed border-gray-600 rounded-md flex items-center justify-center hover:bg-gray-700/50">
                                        <label htmlFor="image-upload" className="cursor-pointer text-gray-400 text-3xl">+</label>
                                        <input id="image-upload" type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" disabled={previewUrls.length >= 4} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Describe your goal:</label>
                            <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Change the swimsuit color to red." className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                         <div className="mb-4 space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Creative Tools</label>
                            <label htmlFor="analysis-upload" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center shadow-lg cursor-pointer">
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Image to Create Prompt'}
                            </label>
                            <input id="analysis-upload" type="file" accept="image/*" onChange={handleAnalysisImageChange} className="hidden" disabled={isAnalyzing}/>
                            <button onClick={handleBack} disabled={generationHistory.length === 0} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg">
                                Back to Previous Generation
                            </button>
                        </div>
                        <button onClick={generateImage} disabled={loading || isAnalyzing} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center shadow-lg mt-auto">
                            {loading ? ( <>{loadingMessage || 'Generating...'}</> ) : ( 'Generate 4 Variations' )}
                        </button>
                    </div>
                </div>
                {error && ( <div className="p-4 mb-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center"><p><strong>Error:</strong> {error}</p></div> )}
                
                <div className="min-h-[250px] flex items-center justify-center">
                    {loading ? (
                         <div className="text-center text-gray-400">
                            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500 mx-auto mb-4"></div>
                            <p>{loadingMessage || 'Conjuring up your images...'}</p>
                        </div>
                    ) : imageUrls.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                            {imageUrls.map((url, index) => (
                                <div key={`${url.slice(-10)}-${index}`} className="relative group aspect-square">
                                    <img src={url} alt={`Generated variation ${index + 1}`} className="w-full h-full object-cover rounded-xl shadow-lg" />
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl">
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => handleEdit(url)} className="bg-blue-500/90 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-600">Edit</button>
                                            <button onClick={() => setUpscaledImageUrl(url)} className="bg-white/90 text-black font-bold py-2 px-5 rounded-lg hover:bg-white">Upscale</button>
                                            <button onClick={() => downloadImage(url, index)} className="bg-white/90 text-black font-bold py-2 px-5 rounded-lg hover:bg-white">Download</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 p-4 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600">
                            <p>No images generated yet. Try creating some!</p>
                        </div>
                    )}
                </div>

                {upscaledImageUrl && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setUpscaledImageUrl(null)}>
                        <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            <img src={upscaledImageUrl} alt="Upscaled view" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                            <button onClick={() => setUpscaledImageUrl(null)} className="absolute -top-3 -right-3 bg-white text-black w-8 h-8 rounded-full text-xl font-bold flex items-center justify-center hover:scale-110">&times;</button>
                        </div>
                    </div>
                )}
                
                {analysisResult && (
                     <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setAnalysisResult(null)}>
                        <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                             <h2 className="text-2xl font-bold text-blue-400 mb-4">Image Analysis Complete</h2>
                             <p className="text-gray-300 mb-4">The AI has generated the following detailed prompt. Copy this to use it in your next generation.</p>
                             <textarea readOnly value={analysisResult} className="w-full h-64 p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 mb-4 resize-none"/>
                             <div className="flex justify-end gap-4">
                                 <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{copied ? 'Copied!' : 'Copy Prompt'}</button>
                                 <button onClick={() => setAnalysisResult(null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Close</button>
                             </div>
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
};

export default App;
