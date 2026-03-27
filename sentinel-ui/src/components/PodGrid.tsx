interface Props {
  active: number
  max: number
  theme: 'dark' | 'light'
}

export function PodGrid({ active, max, theme }: Props) {
  const isDark = theme === 'dark'

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 0' }}>
      {Array.from({ length: max }, (_, i) => {
        const isActive = i < active
        return (
          <div
            key={i}
            title={isActive ? `Pod ${i + 1} — RUNNING` : `Pod ${i + 1} — INACTIVE`}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${isActive ? '#6366f1' : isDark ? '#2a3140' : '#d1d5db'}`,
              background: isActive
                ? isDark ? '#6366f120' : '#eef2ff'
                : isDark ? '#161c26' : '#f3f4f6',
              position: 'relative',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isActive && (
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#6366f1',
                boxShadow: '0 0 6px #6366f1',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
            )}
            {!isActive && (
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isDark ? '#2a3140' : '#d1d5db',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
