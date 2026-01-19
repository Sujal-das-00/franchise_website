let allFranchises = []; // To store original data

async function loadFranchises() {
    try {
        const response = await fetch('franchises.json');
        allFranchises = await response.json();
        renderCards(allFranchises);
    } catch (error) {
        console.error("Error:", error);
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const industry = document.getElementById('industrySelect').value;
    const orderBy = document.getElementById('orderSelect').value;

    let filtered = allFranchises.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm);
        const matchesIndustry = industry === "" || item.category === industry;
        return matchesSearch && matchesIndustry;
    });

    // Sorting Logic
    if (orderBy === "min-low") {
        filtered.sort((a, b) => parseInt(a.minInvestment.replace(/\D/g,'')) - parseInt(b.minInvestment.replace(/\D/g,'')));
    } else if (orderBy === "max-high") {
        filtered.sort((a, b) => parseInt(b.avgInvestment.replace(/\D/g,'')) - parseInt(a.avgInvestment.replace(/\D/g,'')));
    } else if (orderBy === "alpha") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    renderCards(filtered);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize search functionality
    loadFranchises();
    
    // Add event listeners for search form elements
    const exploreBtn = document.getElementById('exploreBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    if (exploreBtn) {
        exploreBtn.addEventListener('click', applyFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('search-input').value = "";
            document.getElementById('industrySelect').value = "";
            document.getElementById('orderSelect').value = "";
            renderCards(allFranchises);
        });
    }
});

// Re-render function
function renderCards(items) {
    console.log('Filtered franchises:', items);
    if (window.opener) {
        console.log('Results available for parent window');
    }
}

// Export functions for use in modal context
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadFranchises,
        applyFilters,
        renderCards
    };
}
