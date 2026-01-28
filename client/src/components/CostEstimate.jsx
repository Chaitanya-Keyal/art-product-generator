function CostEstimate({ costEstimate, loading, header }) {
    if (loading && !costEstimate) {
        return (
            <div
                style={{
                    textAlign: 'center',
                    padding: '1rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    marginTop: '1rem',
                }}
            >
                Calculating cost...
            </div>
        );
    }

    if (!costEstimate) {
        return null;
    }

    const { perRequest, numberOfRequests, totals, rates, costs, totalCost } = costEstimate;

    const rowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        color: 'var(--text-primary)',
        marginBottom: '0.25rem',
    };

    const labelStyle = {
        color: 'var(--text-secondary)',
    };

    const calcStyle = {
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginLeft: '0.5rem',
    };

    return (
        <div
            style={{
                padding: '1rem',
                background: 'rgba(139, 92, 246, 0.05)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--primary)',
                margin: '1rem 0',
            }}
        >
            <p
                style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.75rem',
                    fontWeight: '600',
                }}
            >
                {header || 'Estimated Cost:'}
            </p>

            {/* Per-request breakdown */}
            <div
                style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.75rem',
                    padding: '0.5rem',
                    background: 'rgba(0,0,0,0.03)',
                    borderRadius: '4px',
                }}
            >
                <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Per request:</strong> {perRequest.inputImages} input image
                    {perRequest.inputImages !== 1 ? 's' : ''} +{' '}
                    {perRequest.textTokens.toLocaleString()} tokens (~
                    {perRequest.textChars.toLocaleString()} chars)
                </div>
                <div>
                    <strong>Total requests:</strong> {numberOfRequests} (one per output image)
                </div>
            </div>

            {/* Input images cost */}
            <div style={rowStyle}>
                <span>
                    <span style={labelStyle}>Input Images:</span>
                    <span style={calcStyle}>
                        {perRequest.inputImages} × {numberOfRequests} = {totals.inputImages}
                    </span>
                </span>
                <span>
                    {totals.inputImages} × ${rates.imageInput} = ${costs.imageInput.toFixed(4)}
                </span>
            </div>

            {/* Output images cost */}
            <div style={rowStyle}>
                <span>
                    <span style={labelStyle}>Output Images:</span>
                </span>
                <span>
                    {totals.outputImages} × ${rates.imageOutput} = ${costs.imageOutput.toFixed(4)}
                </span>
            </div>

            {/* Text cost */}
            <div style={{ ...rowStyle, marginBottom: '0.75rem' }}>
                <span>
                    <span style={labelStyle}>Text Input:</span>
                    <span style={calcStyle}>
                        {perRequest.textTokens.toLocaleString()} × {numberOfRequests} ={' '}
                        {totals.textTokens.toLocaleString()} tokens
                    </span>
                </span>
                <span>${costs.textInput.toFixed(6)}</span>
            </div>

            {/* Total */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'var(--primary)',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border)',
                }}
            >
                <span>Total:</span>
                <span>${totalCost.toFixed(4)}</span>
            </div>
        </div>
    );
}

export default CostEstimate;
