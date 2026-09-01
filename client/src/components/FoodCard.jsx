import { ChevronRight, Flame, Plus, Trash2 } from "lucide-react";

function FoodCard({
    food,
    onSelect,
    onDelete,
    onCopy,
    selected
}) {
    const getStatusColor = () => {
        switch (food.Status) {
            case "Approved":
                return "#22c55e";

            case "Pending":
                return "#f59e0b";

            case "Private":
                return "#3b82f6";

            default:
                return "#64748b";
        }
    };

    return (
        <article
            className={`food-item ${selected ? "selected" : ""}`}
            onClick={() => onSelect(food)}
        >
            <div className="food-item-info">
                <div className="food-card-topline">
                    <h3>{food.Name}</h3>

                    <span
                        className="food-status"
                        style={{
                            backgroundColor: getStatusColor()
                        }}
                    >
                        {food.Status}
                    </span>
                </div>

                <div className="food-card-meta">
                    <span>
                        <Flame size={14} />
                        {food.Calories} kcal
                    </span>
                    <span>{food.Protein}g protein</span>
                    <span>{food.ServingSize}g serving</span>
                </div>
            </div>

            <div className="food-card-actions">
                <button
                    className={`delete-food-btn ${food.Scope === "public" ? "copy-food-btn" : ""}`}
                    type="button"
                    aria-label={food.Scope === "public" ? `Copy ${food.Name}` : `Delete ${food.Name}`}
                    title={food.Scope === "public" ? `Copy ${food.Name}` : `Delete ${food.Name}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (food.Scope === "public") {
                            onCopy(food.Id);
                        }
                        else {
                            onDelete(food.Id);
                        }
                    }}
                >
                    {
                        food.Scope === "public"
                            ? <Plus size={17} />
                            : <Trash2 size={17} />
                    }
                </button>

                <ChevronRight
                    className="food-card-chevron"
                    size={18}
                />
            </div>
        </article>
    );
}

export default FoodCard;
