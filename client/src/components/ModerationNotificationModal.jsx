import { CheckCircle2, XCircle } from "lucide-react";
import "../styles/Recipes.css";

function ModerationNotificationModal({
    notifications = [],
    onDismiss
}) {
    if (notifications.length === 0) return null;

    const notification = notifications[0];
    const approved = notification.Status === "Approved";
    const Icon = approved ? CheckCircle2 : XCircle;

    return (
        <div className="modal-overlay">
            <div className="recipe-admin-message">
                <div className="recipe-section-heading">
                    <div>
                        <span className="section-kicker">{notification.EntityType}</span>
                        <h3>{notification.EntityName}</h3>
                    </div>

                    <Icon
                        size={24}
                        className={approved ? "moderation-approved-icon" : "moderation-rejected-icon"}
                    />
                </div>

                <p>
                    Your {notification.EntityType.toLowerCase()} was {notification.Status.toLowerCase()}.
                    {notification.AdminMessage ? ` ${notification.AdminMessage}` : ""}
                </p>

                <button
                    className="recipe-primary-button"
                    type="button"
                    onClick={() => onDismiss(notification.Id)}
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

export default ModerationNotificationModal;
