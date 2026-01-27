function Collapsible({
    title,
    isExpanded,
    onToggle,
    children,
    variant = 'default', // 'default' | 'compact'
}) {
    const styles =
        variant === 'compact'
            ? {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
              }
            : {
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text)',
              };

    return (
        <div>
            <button type="button" onClick={onToggle} style={styles}>
                {variant === 'compact' ? (
                    <>
                        <span
                            style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                transition: 'transform 0.2s',
                            }}
                        >
                            ▼
                        </span>
                        {title}
                    </>
                ) : (
                    <>
                        <span>{title}</span>
                        <span
                            style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                transition: 'transform 0.2s',
                            }}
                        >
                            ▼
                        </span>
                    </>
                )}
            </button>
            {isExpanded && (
                <div style={{ marginTop: variant === 'compact' ? '0.75rem' : '1rem' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

export default Collapsible;
