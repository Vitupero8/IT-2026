function DashboardCard({ icon, title, description, onClick }) {
    return (
        <div className="dashboard-card" onClick={onClick}>

            <div className="card-icon">
                {icon}
            </div>

            <h2>{title}</h2>

            <p>{description}</p>

        </div>
    );
}

export default DashboardCard;