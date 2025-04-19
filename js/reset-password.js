async function resetPassword() {
    let email = document.getElementById("reset-email").value;
    let resetMessage = document.getElementById("reset-message");

    if (!email) {
        resetMessage.textContent = "Email harus diisi!";
        resetMessage.style.color = "red";
        return;
    }

    try {
        let response = await fetch("http://localhost:3000/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        let result = await response.json();
        resetMessage.textContent = result.message;
        
        if (result.success) {
            resetMessage.style.color = "green";
        } else {
            resetMessage.style.color = "red";
        }
    } catch (error) {
        resetMessage.textContent = "Terjadi kesalahan saat reset password. Coba lagi nanti.";
        resetMessage.style.color = "red";
        console.error("Error:", error);
    }
}