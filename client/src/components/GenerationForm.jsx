import { useState, useRef, useEffect } from 'react';

function GenerationForm({ artForms, onGenerate, generating }) {
    const [artFormKey, setArtFormKey] = useState('');
    const [artFormDropdownOpen, setArtFormDropdownOpen] = useState(false);
    const [productType, setProductType] = useState('');
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [referenceImage, setReferenceImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [validationError, setValidationError] = useState('');
    const [model, setModel] = useState('gemini-3-pro');
    const [numberOfImages, setNumberOfImages] = useState(1);

    const modelOptions = [
        { key: 'gemini-3-pro', name: 'Nano Banana Pro', description: 'Best quality, slower' },
        { key: 'gemini-2.5-flash', name: 'Nano Banana', description: 'Faster generation' },
    ];

    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);

    const selectedArtForm = artForms.find((af) => af.key === artFormKey);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setArtFormDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setReferenceImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setReferenceImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        setValidationError('');

        if (!artFormKey) {
            setValidationError('Please select an art form');
            return;
        }

        if (!productType.trim()) {
            setValidationError('Please enter a product type');
            return;
        }

        onGenerate({
            artFormKey,
            productType: productType.trim(),
            additionalInstructions: additionalInstructions.trim(),
            referenceImage,
            model,
            numberOfImages,
        });
    };

    const productSuggestions = [
        'Coffee Mug',
        'Notebook',
        'Tote Bag',
        'Pen',
        'Cushion Cover',
        'Wall Art',
        'Phone Case',
        'Coaster Set',
        'Scarf',
        'Diary',
    ];

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h2 className="card-title">Create Your Art Product</h2>

            {validationError && <div className="validation-error">{validationError}</div>}

            <div className="form-group">
                <label className="form-label">Art Form *</label>
                <span className="form-sublabel">Choose the Indian art style for your product</span>
                <div className="art-form-dropdown" ref={dropdownRef}>
                    <button
                        type="button"
                        className={`art-form-dropdown-trigger ${selectedArtForm ? 'has-value' : ''}`}
                        onClick={() => setArtFormDropdownOpen(!artFormDropdownOpen)}
                    >
                        {selectedArtForm ? (
                            <div className="art-form-dropdown-selected">
                                {selectedArtForm.previewImage && (
                                    <img
                                        src={selectedArtForm.previewImage}
                                        alt={selectedArtForm.name}
                                        className="art-form-dropdown-preview"
                                    />
                                )}
                                <div className="art-form-dropdown-selected-text">
                                    <span className="art-form-dropdown-name">
                                        {selectedArtForm.name}
                                    </span>
                                    <span className="art-form-dropdown-desc">
                                        {selectedArtForm.description}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <span className="art-form-dropdown-placeholder">
                                Select an art form...
                            </span>
                        )}
                        <svg
                            className={`art-form-dropdown-arrow ${artFormDropdownOpen ? 'open' : ''}`}
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                    {artFormDropdownOpen && (
                        <div className="art-form-dropdown-menu">
                            {artForms.map((af) => (
                                <button
                                    key={af.key}
                                    type="button"
                                    className={`art-form-dropdown-item ${artFormKey === af.key ? 'selected' : ''}`}
                                    onClick={() => {
                                        setArtFormKey(af.key);
                                        setArtFormDropdownOpen(false);
                                    }}
                                >
                                    {af.previewImage && (
                                        <img
                                            src={af.previewImage}
                                            alt={af.name}
                                            className="art-form-dropdown-item-preview"
                                        />
                                    )}
                                    <div className="art-form-dropdown-item-content">
                                        <span className="art-form-dropdown-item-name">
                                            {af.name}
                                        </span>
                                        <span className="art-form-dropdown-item-desc">
                                            {af.description}
                                        </span>
                                    </div>
                                    {artFormKey === af.key && (
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 20 20"
                                            fill="var(--primary)"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Product Type *</label>
                <span className="form-sublabel">What product do you want to design?</span>
                <input
                    type="text"
                    className="form-input"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    placeholder="e.g., Coffee Mug, Tote Bag, Notebook..."
                    required
                />
                <div
                    style={{
                        marginTop: '0.5rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}
                >
                    {productSuggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            className="btn-secondary"
                            style={{
                                padding: '0.25rem 0.75rem',
                                fontSize: '0.875rem',
                                borderRadius: '20px',
                            }}
                            onClick={() => setProductType(suggestion)}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Reference Image (Optional)</label>
                <span className="form-sublabel">
                    Upload an image of the product for better results
                </span>
                <div
                    className={`file-upload ${referenceImage ? 'has-file' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {previewUrl ? (
                        <div>
                            <img src={previewUrl} alt="Preview" className="file-preview" />
                            <p style={{ marginTop: '0.5rem', color: 'var(--success)' }}>
                                {referenceImage.name}
                            </p>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ marginTop: '0.5rem', padding: '0.25rem 1rem' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFile();
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="file-upload-icon"></div>
                            <p className="file-upload-text">
                                Click to upload or drag and drop
                                <br />
                                <small>PNG, JPG, WEBP up to 10MB</small>
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Additional Instructions (Optional)</label>
                <span className="form-sublabel">
                    Any specific details or preferences for the AI
                </span>
                <textarea
                    className="form-textarea"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="e.g., Use earthy colors, make the design minimalist, focus on peacock motifs..."
                />
            </div>

            <div className="form-group">
                <label className="form-label">Number of Variations</label>
                <span className="form-sublabel">How many design variations to generate</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => setNumberOfImages(num)}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '8px',
                                border:
                                    numberOfImages === num
                                        ? '2px solid var(--primary)'
                                        : '1px solid var(--border)',
                                background:
                                    numberOfImages === num
                                        ? 'rgba(139, 92, 246, 0.1)'
                                        : 'var(--surface)',
                                color: numberOfImages === num ? 'var(--primary)' : 'var(--text)',
                                fontWeight: numberOfImages === num ? '600' : '400',
                                fontSize: '1.125rem',
                                cursor: 'pointer',
                            }}
                        >
                            {num}
                        </button>
                    ))}
                </div>
                {numberOfImages > 1 && (
                    <p
                        style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.5rem',
                        }}
                    >
                        The AI may sometimes return fewer images than requested
                    </p>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">AI Model</label>
                <span className="form-sublabel">Choose the generation model</span>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {modelOptions.map((opt) => (
                        <label
                            key={opt.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                border:
                                    model === opt.key
                                        ? '2px solid var(--primary)'
                                        : '1px solid var(--border)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background:
                                    model === opt.key
                                        ? 'rgba(139, 92, 246, 0.1)'
                                        : 'var(--surface)',
                                flex: '1',
                                minWidth: '180px',
                            }}
                        >
                            <input
                                type="radio"
                                name="model"
                                value={opt.key}
                                checked={model === opt.key}
                                onChange={(e) => setModel(e.target.value)}
                                style={{ accentColor: 'var(--primary)' }}
                            />
                            <div>
                                <div style={{ fontWeight: '500' }}>{opt.name}</div>
                                <div
                                    style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                                >
                                    {opt.description}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={generating || !artFormKey || !productType.trim()}
            >
                {generating ? (
                    <>
                        <div className="spinner"></div>
                        <span>Generating your art... Please wait</span>
                    </>
                ) : (
                    <>Generate Art Product</>
                )}
            </button>

            {generating && (
                <p
                    style={{
                        textAlign: 'center',
                        marginTop: '1rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                    }}
                >
                    This process typically takes 30-60 seconds. Thank you for your patience!
                </p>
            )}
        </form>
    );
}

export default GenerationForm;
