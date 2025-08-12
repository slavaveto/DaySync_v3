import { toast } from "react-hot-toast";

interface NetworkToastProps {
    type: 'offline' | 'online';
    title: string;
    message: string;
    duration?: number;
}

export const showNetworkToast = ({ type, title, message, duration = Infinity }: NetworkToastProps) => {
    const color = type === 'offline' ? '#dc2626' : '#16a34a';
    const icon = type === 'offline' ? '🔴' : '✅';

    return toast((t) => (
        <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '10px',
            minWidth: '300px'
        }}>
            {/* Крестик в правом верхнем углу */}
            <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                    position: 'absolute',
                    top: '0px',
                    right: '0px',
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: '#666',
                    lineHeight: '1'
                }}
                title="Закрыть"
            >
                ×
            </button>

            {/* Основной контент */}
            <div style={{
                fontWeight: 'bold',
                color: color,
                paddingRight: '20px'
            }}>
                {icon} {title}
            </div>
            <div style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.4'
            }}>
                {message}
            </div>
        </div>
    ), {
        duration,
        position: "top-right",
        className: "!bg-content2"
    });
};