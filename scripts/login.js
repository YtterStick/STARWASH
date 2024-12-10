document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const passwordInput = document.getElementById("password");
    const spinner = document.querySelector(".login-btn .spinner"); // Spinner inside button
    const loginButton = document.querySelector(".login-btn");

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Show the loading spinner inside the button
        loginButton.classList.add("loading");

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        fetch("/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
            .then((res) => {
                if (!res.ok) {
                    return res.json().then((errorData) => {
                        throw new Error(errorData.message || "Login failed.");
                    });
                }
                return res.json();
            })
            .then((result) => {
                // Hide the loading spinner after login attempt finishes
                loginButton.classList.remove("loading");

                if (result.userId && result.role && (result.branch_id !== undefined || result.role === "Admin")) {
                    sessionStorage.setItem("userId", result.userId);
                    sessionStorage.setItem("role", result.role);
                    if (result.branch_id) {
                        sessionStorage.setItem("branch_id", result.branch_id);
                    }

                    if (result.role === "Admin") {
                        window.location.href = "/main/index.html";
                    } else if (result.role === "Staff") {
                        window.location.href = "/main/staff.html";
                    } else {
                        throw new Error("Unknown role.");
                    }
                } else {
                    throw new Error("Invalid response data.");
                }
            })
            .catch((err) => {
                // Hide the loading spinner after login attempt finishes
                loginButton.classList.remove("loading");

                showPasswordError("Incorrect password. Try again.");
                console.error("Login error:", err);
            });
    });

    function showPasswordError(message) {
        passwordInput.value = ""; // Clear the input
        passwordInput.placeholder = message; // Show error message
        passwordInput.classList.add("error");
        passwordInput.focus(); // Focus on the input field
        setTimeout(() => {
            passwordInput.placeholder = "Password"; // Reset the placeholder after 3 seconds
            passwordInput.classList.remove("error");
        }, 3000);
    }
});
