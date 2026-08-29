document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('vitals-form');
    const submitBtn = document.getElementById('submit-btn');
    const resultsPlaceholder = document.getElementById('results-placeholder');
    const resultsContent = document.getElementById('results-content');
    
    const dangerCard = document.getElementById('danger-card');
    const dangerValue = document.getElementById('danger-value');
    const precautionsValue = document.getElementById('precautions-value');
    
    // toggleRawBtn removed as we now use the accordion


    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Gather form data
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const systolic = document.getElementById('systolic').value;
        const diastolic = document.getElementById('diastolic').value;
        const sugar = document.getElementById('sugar').value;
        const heart = document.getElementById('heart').checked ? 'Yes' : 'None';
        const injuries = document.getElementById('injuries').checked ? 'Yes' : 'None';
        const notes = document.getElementById('notes').value || 'None';

        const prompt = `Patient Info: Age ${age}, Gender ${gender}, BP ${systolic}/${diastolic}, Fasting Sugar ${sugar} mg/dL, Heart: ${heart}, Past Injuries: ${injuries}, Notes: ${notes}.
Please provide ONLY the Danger Level and Precautions. Do NOT write a long thought process or reasoning. Keep it very concise.`;

        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        // Reset UI
        const thoughtContent = document.getElementById('thought-content');
        thoughtContent.textContent = "AI is thinking...\n";
        thoughtContent.classList.add('thinking-pulse');
        
        dangerValue.textContent = "Analyzing...";
        precautionsValue.innerHTML = "<em>Analyzing...</em>";
        dangerCard.className = "result-card danger-level";
        
        resultsPlaceholder.classList.add('hidden');
        resultsContent.classList.remove('hidden');
        
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'my-medical-ai:latest',
                    prompt: prompt,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = "";
            let thinkContent = "";
            let buffer = "";

            // Start streaming
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Keep the last partial line in the buffer
                buffer = lines.pop();
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    try {
                        const parsed = JSON.parse(line);
                        
                        // Handle DeepSeek-R1 "thinking" field natively parsed by Ollama
                        if (parsed.thinking) {
                            thinkContent += parsed.thinking;
                            thoughtContent.textContent = thinkContent;
                        }
                        
                        // Handle final response content
                        if (parsed.response) {
                            // If this is the first response token, stop the thinking pulse
                            if (fullText.length === 0) {
                                thoughtContent.classList.remove('thinking-pulse');
                                if (thinkContent.trim() === '') {
                                    thoughtContent.textContent = "AI processed immediately without extended reasoning.";
                                }
                            }
                            
                            fullText += parsed.response;
                            precautionsValue.innerHTML = fullText.split('\n').map(l => `<p>${l}</p>`).join('');
                        }
                        
                    } catch (e) {
                        console.warn("JSON parse error on line:", line, e);
                    }
                }
            }

            // After stream finishes, extract the Danger Level
            thoughtContent.classList.remove('thinking-pulse');
            let dangerLevelText = "Unknown";
            
            // Simple extraction for danger level
            const textLines = fullText.split('\n');
            for (const line of textLines) {
                if (line.toLowerCase().includes('danger level:')) {
                    dangerLevelText = line.split(':')[1].trim();
                    break; // Stop at first match
                }
            }
            
            if (dangerLevelText === "Unknown" && fullText.includes('Danger Level:')) {
                dangerLevelText = fullText.split('Danger Level:')[1].split('\n')[0].trim();
            }

            // Apply danger color classes
            const lowerDanger = dangerLevelText.toLowerCase();
            if (lowerDanger.includes('normal')) {
                dangerCard.classList.add('level-normal');
            } else if (lowerDanger.includes('moderate')) {
                dangerCard.classList.add('level-moderate');
            } else if (lowerDanger.includes('emergency') || lowerDanger.includes('high')) {
                dangerCard.classList.add('level-high');
            } else {
                dangerCard.classList.add('level-moderate'); // Default fallback
            }

            dangerValue.textContent = dangerLevelText;
            
            // Clean up the precautions text
            let cleanPrecautions = fullText;
            const dangerRegex = /^.*danger level.*$/im;
            cleanPrecautions = cleanPrecautions.replace(dangerRegex, '').trim();
            
            if (cleanPrecautions.toLowerCase().includes('precautions:')) {
                cleanPrecautions = cleanPrecautions.substring(cleanPrecautions.toLowerCase().indexOf('precautions:') + 12).trim();
            }
            
            precautionsValue.innerHTML = cleanPrecautions.split('\n').filter(l => l.trim().length > 0).map(l => `<p>${l.trim()}</p>`).join('');
            
            dangerCard.style.transform = 'scale(0.98)';
            setTimeout(() => { dangerCard.style.transform = 'scale(1)'; }, 100);

        } catch (error) {
            console.error("Failed to generate response:", error);
            thoughtContent.textContent = "Error: " + error.message;
            thoughtContent.classList.remove('thinking-pulse');
            alert("Error connecting to the local AI model. Ensure Ollama is running and 'my-medical-ai:latest' model is available.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    });
});
