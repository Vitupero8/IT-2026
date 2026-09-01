    import { useEffect } from "react";
import "../styles/Toast.css";

function Toast({

    show,

    message,

    type,

    onClose

}) {

    useEffect(() => {

        if (!show) return;

        const timer = setTimeout(() => {

            onClose();

        }, 3000);

        return () => clearTimeout(timer);

    }, [show, onClose]);

    if (!show) return null;

    return (

        <div className={`toast ${type}`}>

            {message}

        </div>

    );

}

export default Toast;