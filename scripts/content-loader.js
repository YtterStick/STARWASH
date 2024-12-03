document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('main-content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.location.href = "/api/users/logout"; // Navigates to the logout route
        });
    }

    dropdownLinks.forEach(link => {
        link.addEventListener('click', toggleDropdown);
    });

    function toggleDropdown(event) {
        event.preventDefault();
        const parentItem = event.currentTarget.parentElement;
        parentItem.classList.toggle("open");
    }

    function loadContent(section) {
        const contentFile = `/pages/${section}.html`;

        fetch(contentFile)
            .then(response => {
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(data => {
                mainContent.innerHTML = data;
                setActiveLink(section);

                if (section === 'overall-sales') {
                    initializeServiceSalesChart();
                    initializeMonthlySalesTrendChart();
                } else if (section === 'dashboard') {
                    initializeDashboardChart();
                } else if (section === 'create-account') {
                    attachCreateAccountFormHandler();
                    populateBranchSelection();
                } else if (section === 'existing-account') {
                    fetchExistingAccounts();
                } else if (section === 'create-branch'){
                    attachCreateBranchFormHandler();
                }
            })
            .catch(error => {
                console.error(error);
                mainContent.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    }

    function setActiveLink(activeSection) {
        links.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === activeSection) {
                link.classList.add('active');
            }
        });
    }

    function attachCreateBranchFormHandler() {
        const branchForm = document.getElementById('branch-form');
        if (branchForm) {
            branchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(branchForm);
                const data = Object.fromEntries(formData.entries());

                console.log("Form Data:", data);

                fetch('/api/branches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to create branch');
                    }
                    return response.json();
                })
                .then(data => {
                    alert('Branch created successfully!');
                    console.log("Branch created:", data);
                    branchForm.reset();
                })
                .catch(error => {
                    console.error('Error creating branch:', error);
                    alert('An error occurred while creating the branch.');
                });
            });
        }
    }

    function fetchExistingAccounts() {  
        const tableBody = document.querySelector("#accounts-table tbody");
        const paginationContainer = document.getElementById("pagination-container");
        const recordsPerPage = 8; // Number of records per page
        let currentPage = 1;

        if (!tableBody || !paginationContainer) return;

        const branchId = localStorage.getItem("branch_id");
        console.log("Fetching accounts for branch_id:", branchId);

        function loadRecords(page = 1) {
            fetch(`/api/accounts?branch_id=${branchId}&page=${page}&limit=${recordsPerPage}`)
                .then(response => {
                    if (!response.ok) throw new Error("Network response was not ok");
                    return response.json();
                })
                .then(data => {
                    console.log("Accounts fetched:", data);

                    if (!data || !data.accounts) {
                        console.error("Invalid response format:", data);
                        tableBody.innerHTML = "<tr><td colspan='4'>Error loading accounts.</td></tr>";
                        return;
                    }

                    // Clear the table body before adding new rows
                    tableBody.innerHTML = "";

                    if (data.accounts.length === 0) {
                        console.warn("No accounts found for the given branch.");
                        tableBody.innerHTML = "<tr><td colspan='4'>No accounts found for this branch.</td></tr>";
                        return;
                    }

                    data.accounts.forEach(account => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${account.username}</td>
                            <td>${account.role}</td>
                            <td>${account.branch_name || "N/A"}</td>
                            <td>
                                <button class="edit-btn" data-id="${account.id}">Update</button>
                                <button class="delete-btn" data-id="${account.id}">Delete</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });

                    // Update pagination controls
                    updatePagination(data.totalPages, page);
                })
                .catch(error => {
                    console.error("Error fetching accounts:", error);
                    tableBody.innerHTML = "<tr><td colspan='4'>Error loading accounts. Please try again later.</td></tr>";
                });
        }

        function updatePagination(totalPages, currentPage) {
            paginationContainer.innerHTML = "";

            // Create Previous Button if not on the first page
            if (currentPage > 1) {
                const prevButton = document.createElement("button");
                prevButton.textContent = "Previous";
                prevButton.addEventListener("click", () => {
                    loadRecords(currentPage - 1);
                });
                paginationContainer.appendChild(prevButton);
            }

            // Display Page Info
            const pageInfo = document.createElement("span");
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            paginationContainer.appendChild(pageInfo);

            // Create Next Button if not on the last page
            if (currentPage < totalPages) {
                const nextButton = document.createElement("button");
                nextButton.textContent = "Next";
                nextButton.addEventListener("click", () => {
                    loadRecords(currentPage + 1);
                });
                paginationContainer.appendChild(nextButton);
            }
        }

        loadRecords(currentPage);
    }
    function attachCreateAccountFormHandler() {
        const form = document.getElementById('account-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                console.log("Form Data:", data); // Debugging line to check submitted data

                try {
                    const response = await fetch('/create-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });

                    if (response.ok) {
                        alert('Account created successfully!');
                        e.target.reset();
                    } else {
                        const errorMessage = await response.text();
                        alert(`Failed to create account: ${errorMessage}`);
                    }
                } catch (error) {
                    alert('An unexpected error occurred. Please try again.');
                    console.error("Create Account Error:", error);
                }
            });
        }
    }

    function populateBranchSelection() {
        const branchSelect = document.getElementById('branch_id');
        if (!branchSelect) return;

        fetch('/api/branches')
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch branches');
                return response.json();
            })
            .then(branches => {
                branchSelect.innerHTML = ''; // Clear existing options
                branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.id;
                    option.textContent = branch.name;
                    branchSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error fetching branches:', error);
                alert('An error occurred while loading branches.');
            });
    }
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) loadContent(section);
        });
    });

    loadContent('dashboard');
});
