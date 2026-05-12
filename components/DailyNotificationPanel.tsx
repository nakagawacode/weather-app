type DailyNotificationPanelProps = {
  buttonLabel: string;
  description: string;
  disabled: boolean;
  isCurrentRoom: boolean;
  onRegister: () => void;
  onUnregister: () => void;
  title: string;
};

export function DailyNotificationPanel({
  buttonLabel,
  description,
  disabled,
  isCurrentRoom,
  onRegister,
  onUnregister,
  title,
}: DailyNotificationPanelProps) {
  return (
    <section className="notification-panel" aria-label="毎朝の天気通知">
      <div>
        <p className="comment-label">Morning Push</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <button
        className="secondary-action"
        disabled={disabled}
        onClick={isCurrentRoom ? onUnregister : onRegister}
        type="button"
      >
        {buttonLabel}
      </button>
    </section>
  );
}
