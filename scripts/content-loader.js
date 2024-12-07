function fetchTotalCounts() {
    fetch('/api/branches/total-branches')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('total-branches').textContent = `Total Branches: ${data.total_branches}`;
            } else {
                console.error('Failed to fetch total branches');
            }
        })
        .catch(error => {
            console.error('Error fetching total branches:', error);
        });

    fetch('/api/branches/total-users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('total-users').textContent = `Total Users: ${data.total_users}`;
            } else {
                console.error('Failed to fetch total users');
            }
        })
        .catch(error => {
            console.error('Error fetching total users:', error);
        });
}
document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll('.nav-link[data-section]');
    const mainContent = document.getElementById('main-content-id');
    const dropdownLinks = document.querySelectorAll('.nav-link[onclick="toggleDropdown(event)"]');
    const logoutBtn = document.getElementById("logout-btn");
    
    function fetchTodayIncome() {
        fetch('/api/dashboard/today-income')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch today\'s income.');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const todayIncomeElement = document.getElementById('today-income');
                    if (todayIncomeElement) {
                        const todayIncome = parseFloat(data.today_income);
                        if (!isNaN(todayIncome)) {
                            todayIncomeElement.innerHTML = `&#8369;${todayIncome.toFixed(2)}`;
                        } else {
                            todayIncomeElement.innerHTML = `&#8369;0.00`;
                        }
                    }
                } else {
                    console.warn('Failed to fetch today\'s income:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching today\'s income:', error);
            });
    }
    function fetchTotalSales() {
        fetch('/api/dashboard-total-sales')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch total sales.');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const totalSalesElement = document.getElementById('today-sales');
                    if (totalSalesElement) {
                        const totalSales = parseInt(data.total_sales, 10);
                        totalSalesElement.innerHTML = `${totalSales.toLocaleString()}`;
                    }
                } else {
                    console.warn('Failed to fetch total sales:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching total sales:', error);
            });
    }
    
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.location.href = "/api/users/logout";
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
                fetchTotalSales();
                fetchTodayIncome();
                if (section === 'reports') {
                    populateBranchSelectionForReports();
                    
                }
                 else if (section === 'dashboard') {
                    initializeDashboardChart();
                } else if (section === 'create-account') {
                    attachCreateAccountFormHandler();
                    populateBranchSelection();
                } else if (section === 'existing-account') {
                    fetchExistingAccounts();
                } else if (section === 'create-branch'){
                    populateAllBranches();
                    fetchTotalCounts();
                    attachCreateBranchFormHandler();
                    attachModalCloseHandler();
                    attachEditBranchFormHandler();
                } else if (section === 'sales-record'){
                    populateBranchSelection();
                    attachSalesRecordHandlers();
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
    function populateAllBranches() {
        const branchesTableBody = document.getElementById("branches-table-body");
    
        fetch("/api/branches")
            .then((response) => response.json())
            .then((branches) => {
                console.log("Fetched branches:", branches);
                if (branches.length > 0) {
                    branchesTableBody.innerHTML = branches
                        .map(branch => `
                            <tr>
                                <td>${branch.name}</td>
                                <td>${branch.address || "N/A"}</td>
                                <td>${branch.user_count}</td>
                                <td>
                                    <button class="edit-btn" data-id="${branch.id}">Edit</button>
                                    <button class="delete-btn" data-id="${branch.id}">Delete</button>
                                </td>
                            </tr>
                        `)
                        .join("");
    
                    attachBranchActionHandlers();
                } else {
                    branchesTableBody.innerHTML = "<tr><td colspan='4'>No branches available.</td></tr>";
                }
            })
            .catch((error) => {
                console.error("Error fetching branches:", error);
                branchesTableBody.innerHTML = "<tr><td colspan='4'>An error occurred while loading branches.</td></tr>";
            });
    }
    
    
    function attachBranchActionHandlers() {
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", handleDeleteBranch);
        });
    
        document.querySelectorAll(".edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const branchId = e.target.dataset.id;
                const row = e.target.closest("tr");
                const branchName = row.querySelector("td:nth-child(1)").textContent;
                const branchAddress = row.querySelector("td:nth-child(2)").textContent;
    
                // Populate the modal fields
                document.getElementById("edit-branch-id").value = branchId;
                document.getElementById("edit-branch-name").value = branchName;
                document.getElementById("edit-branch-address").value = branchAddress;
    
                // Show the modal
                document.getElementById("editBranchModal").style.display = "block";
            });
        });
    }
    function attachModalCloseHandler() {
        const modal = document.getElementById("editBranchModal");
        const closeBtn = modal.querySelector(".close-btn");
    
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    
        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }
    
    function handleDeleteBranch(e) {
        const branchId = e.target.dataset.id;
        const branchName = e.target.closest("tr").querySelector("td").textContent; 
        const confirmDelete = window.confirm(`Are you sure you want to permanently delete the branch "${branchName}"? This action cannot be undone.`);
    
        if (confirmDelete) {
            fetch(`/api/branches/${branchId}`, { method: "DELETE" })
                .then(response => {
                    if (!response.ok) throw new Error("Failed to delete the branch.");
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        alert("Branch deleted successfully!");
                        populateAllBranches(); // Refresh the branch list
                    } else {
                        alert("Failed to delete the branch. Please try again.");
                    }
                })
                .catch(error => {
                    console.error("Error deleting branch:", error);
                    alert("An error occurred while deleting the branch.");
                });
        }
    }
    function attachEditBranchFormHandler() {
        const editBranchForm = document.getElementById("edit-branch-form");
    
        editBranchForm.addEventListener("submit", (e) => {
            e.preventDefault();
    
            const branchId = document.getElementById("edit-branch-id").value;
            const updatedName = document.getElementById("edit-branch-name").value;
            const updatedAddress = document.getElementById("edit-branch-address").value;
    
            fetch(`/api/branches/${branchId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: updatedName, address: updatedAddress }),
            })
                .then((response) => {
                    if (!response.ok) throw new Error("Failed to update branch.");
                    return response.json();
                })
                .then((data) => {
                    if (data.success) {
                        alert("Branch updated successfully!");
                        document.getElementById("editBranchModal").style.display = "none";
                        populateAllBranches(); // Refresh the table
                    } else {
                        alert("Failed to update the branch. Please try again.");
                    }
                })
                .catch((error) => {
                    console.error("Error updating branch:", error);
                    alert("An error occurred while updating the branch.");
                });
        });
    }
    function populateBranchSelectionForReports() {

        const branchFilter = document.getElementById("branch-filter");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
    
        if (!branchFilter) return;
    
        fetch("/api/branches")
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch branches");
                return response.json();
            })
            .then((branches) => {
                branchFilter.innerHTML = "";
                branches.forEach((branch) => {
                    const option = document.createElement("option");
                    option.value = branch.id;
                    option.textContent = branch.name;
                    branchFilter.appendChild(option);
                });
    
                if (branches.length > 0) {
                    branchFilter.value = branches[0].id;
                    const currentYear = new Date().getFullYear();
                    startDateInput.value = `${currentYear}-01-01`;
                    endDateInput.value = `${currentYear}-12-31`;
                    loadChartData();
                }
            branchFilter.addEventListener("change", loadChartData); // Update on branch change
            startDateInput.addEventListener("change", loadChartData); // Update on start date change
            endDateInput.addEventListener("change", loadChartData); // Update on end date change
            })
            .catch((error) => {
                console.error("Error populating branch selection for reports:", error);
                alert("An error occurred while loading branches.");
            });
    }
    
    function loadChartData() {
        const branchFilter = document.getElementById("branch-filter");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
    
        if (!branchFilter) {
            console.warn("Branch filter element not found.");
            return;
        }
    
        const branchId = branchFilter.value; 
        const startDate = startDateInput ? startDateInput.value : '';
        const endDate = endDateInput ? endDateInput.value : '';
    
        console.log("Selected Branch ID:", branchId);
        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);
    
        if (!branchId) {
            console.warn("Branch ID is required for loading chart data.");
            return;
        }
    
        fetch(`/api/branches/reports?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`)
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch report data.");
                return response.json();
            })
            .then(data => {
                console.log("Report Data:", data);
                if (data.success && data.data.length > 0) {
                    updateReportChart(data.data);
                } else {
                    console.warn("No data available for the selected branch and date range.");
                    updateReportChart([]); 
                }
            })
            .catch(error => {
                console.error("Error initializing report chart:", error);
            });
    }
    function fetchExistingAccounts() {  
        const tableBody = document.querySelector("#accounts-table tbody");
        const paginationContainer = document.getElementById("pagination-container");
        const recordsPerPage = 8;
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

                    updatePagination(data.totalPages, page);
                })
                .catch(error => {
                    console.error("Error fetching accounts:", error);
                    tableBody.innerHTML = "<tr><td colspan='4'>Error loading accounts. Please try again later.</td></tr>";
                });
        }

        function updatePagination(totalPages, currentPage) {
            paginationContainer.innerHTML = "";

            if (currentPage > 1) {
                const prevButton = document.createElement("button");
                prevButton.textContent = "Previous";
                prevButton.addEventListener("click", () => {
                    loadRecords(currentPage - 1);
                });
                paginationContainer.appendChild(prevButton);
            }

            const pageInfo = document.createElement("span");
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            paginationContainer.appendChild(pageInfo);

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

    function populateBranchSelection() {
        const branchSelects = document.querySelectorAll('#branch_id, #branch-filter');
        
        fetch('/api/branches')
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch branches');
                return response.json();
            })
            .then(branches => {
                branchSelects.forEach(branchSelect => {
                    branchSelect.innerHTML = '';
                    branches.forEach(branch => {
                        const option = document.createElement('option');
                        option.value = branch.id;
                        option.textContent = branch.name;
                        branchSelect.appendChild(option);
                    });
                });
                loadFilteredSalesRecords();
            })
            .catch(error => {
                console.error('Error fetching branches:', error);
                alert('An error occurred while loading branches.');
            });
    }

    function loadFilteredSalesRecords(page = 1) {
        const branchFilter = document.getElementById("branch-filter");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        const sortOption = document.getElementById("sort-option");
        const salesTableBody = document.querySelector(".sales-table tbody");
        const paginationContainer = document.querySelector(".pagination");
    
        // Set default dates for the current year
        const currentYear = new Date().getFullYear();
        const defaultStartDate = `${currentYear}-01-01`; // YYYY-MM-DD
        const defaultEndDate = `${currentYear}-12-31`; // YYYY-MM-DD
    
        // If the input fields are empty, set them to default values
        if (startDateInput && !startDateInput.value) {
            startDateInput.value = defaultStartDate;
        }
        if (endDateInput && !endDateInput.value) {
            endDateInput.value = defaultEndDate;
        }
    
        const branchId = branchFilter ? branchFilter.value : null;
        const startDate = startDateInput ? startDateInput.value : defaultStartDate;
        const endDate = endDateInput ? endDateInput.value : defaultEndDate;
        let sortBy = sortOption ? sortOption.value : "created_at";
    
        const validSortOptions = {
            "date-created": "created_at",
            "date-paid": "paid_at",
            "date-claimed": "claimed_at",
        };
    
        if (validSortOptions[sortBy]) {
            sortBy = validSortOptions[sortBy];
        } else {
            console.error("Invalid sort option:", sortBy);
            return;
        }
    
        if (!branchId) {
            console.error("Branch ID is required.");
            salesTableBody.innerHTML = "<tr><td colspan='8'>Please select a branch to load sales data.</td></tr>";
            return;
        }
    
        fetch(`/api/branches/sales-records?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}&sort_option=${sortBy}&page=${page}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.success && data.sales.length > 0) {
                    salesTableBody.innerHTML = data.sales
                        .map((sale) => `
                            <tr>
                                <td>${sale.customer_name ?? "N/A"}</td>
                                <td>${sale.fabric_softener_count ?? "0"}</td>
                                <td>${sale.detergent_count ?? "0"}</td>
                                <td>${sale.number_of_loads ?? "0"}</td>
                                <td>${sale.total_cost !== null ? parseFloat(sale.total_cost).toLocaleString() : "N/A"}</td>
                                <td>${sale.payment_status ?? "N/A"}</td>
                                <td>${sale.claimed_status ?? "N/A"}</td>
                                <td>${sale[sortBy] ? new Date(sale[sortBy]).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "N/A"}</td> <!-- MM/DD/YYYY, HH:MM AM/PM -->
                            </tr>
                        `)
                        .join("");
                    updatePagination(data.totalPages, page);
                } else {
                    salesTableBody.innerHTML = "<tr><td colspan='8'>No sales data available for the selected filters.</td></tr>";
                    paginationContainer.innerHTML = "";
                }
            })
            .catch((error) => {
                console.error("Error fetching sales records:", error);
                salesTableBody.innerHTML = "<tr><td colspan='8'>An error occurred while loading sales data. Please try again later.</td></tr>";
            });
    }
    
    
    function updatePagination(totalPages, currentPage) {
        const paginationContainer = document.querySelector(".pagination");
        paginationContainer.innerHTML = "";
    
        if (currentPage > 1) {
            const prevButton = document.createElement("button");
            prevButton.textContent = "Previous";
            prevButton.addEventListener("click", () => loadFilteredSalesRecords(currentPage - 1));
            paginationContainer.appendChild(prevButton);
        }
    
        const pageInfo = document.createElement("span");
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationContainer.appendChild(pageInfo);
    
        if (currentPage < totalPages) {
            const nextButton = document.createElement("button");
            nextButton.textContent = "Next";
            nextButton.addEventListener("click", () => loadFilteredSalesRecords(currentPage + 1));
            paginationContainer.appendChild(nextButton);
        }
    }
    
    function attachSalesRecordHandlers() {
        loadFilteredSalesRecords(); // Load the first page by default
        const branchFilter = document.getElementById("branch-filter");
        const sortOption = document.getElementById("sort-option");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
    
        if (branchFilter) {
            branchFilter.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
        if (sortOption) {
            sortOption.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
        if (startDateInput) {
            startDateInput.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
        if (endDateInput) {
            endDateInput.addEventListener("change", () => loadFilteredSalesRecords(1));
        }
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
