function ProgressBar({ title, current, target, color }) {

    const percentage = Math.min((current / target) * 100, 100);

    return (
        <div className="progress-card">

            <div className="progress-header">

                <span>{title}</span>

                <span>
                    {Math.round(percentage)}% &nbsp;&nbsp;
                    {current} / {target}
                </span>

            </div>

            <div className="progress-background">

                <div
                    className="progress-fill"
                    style={{
                        width: `${percentage}%`,
                        background: color
                    }}
                ></div>

            </div>

        </div>
    );

}

export default ProgressBar;