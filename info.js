document.addEventListener('DOMContentLoaded', () => {
    // 1. Get Franchise ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const franchiseId = urlParams.get('id');

    fetch('franchises.json')
        .then(res => res.json())
        .then(data => {
            const allFranchises = [...data.leading, ...data.opportunities];
            
            // 2. Find and Load Current Franchise
            const current = allFranchises.find(f => f.id == franchiseId) || allFranchises[0];
            loadDetails(current);

            // 3. Generate Random Recommendations (Explore Others)
            renderRandomRecommendations(allFranchises);
        });
});

function loadDetails(f) {
    document.getElementById('mainBrandLogo').src = f.logo;
    document.getElementById('brandDescriptionTitle').textContent = `About Brand - ${f.name.toUpperCase()}`;
    document.getElementById('brandText').textContent = f.description || "Detailed description for this brand is coming soon...";
    
    const statsBar = document.getElementById('statsBar');
    const stats = [
        { label: 'Average Investment', value: f.avgInvestment },
        { label: 'Minimum Investment', value: f.minInvestment },
        { label: 'Min. Liquidity', value: f.liquidity || '$10,000' },
        { label: 'Year Established', value: f.year || '2017' },
        { label: 'No. of Outlets', value: f.outlets },
        { label: 'In House Financing', value: f.financing ? 'Yes' : 'No' },
        { label: 'Coaching', value: f.coaching ? 'Yes' : 'No' }
    ];

    statsBar.innerHTML = stats.map(s => `
        <div class="stat-item">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}</div>
        </div>
    `).join('');
}

function renderRandomRecommendations(all) {
    const grid = document.getElementById('randomGrid');
    // Shuffle array and take 4 random items
    const shuffled = all.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);

    grid.innerHTML = selected.map(item => `
        <div class="franchise-card">
            <div class="logo-container"><img src="${item.logo}"></div>
            <span class="cat-label">${item.category}</span>
            <h3 class="franchise-name">${item.name}</h3>
            <div class="data-row"><span>Investment</span> <strong>${item.avgInvestment}</strong></div>
            <a href="details.html?id=${item.id}" class="know-more-btn">Know More</a>
        </div>
    `).join('');
}document.addEventListener('DOMContentLoaded', () => {
    // 1. Get Franchise ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const franchiseId = urlParams.get('id');

    fetch('franchises.json')
        .then(res => res.json())
        .then(data => {
            const allFranchises = [...data.leading, ...data.opportunities];
            
            // 2. Find and Load Current Franchise
            const current = allFranchises.find(f => f.id == franchiseId) || allFranchises[0];
            loadDetails(current);

            // 3. Generate Random Recommendations (Explore Others)
            renderRandomRecommendations(allFranchises);
        });
});

function loadDetails(f) {
    document.getElementById('mainBrandLogo').src = f.logo;
    document.getElementById('brandDescriptionTitle').textContent = `About Brand - ${f.name.toUpperCase()}`;
    document.getElementById('brandText').textContent = f.description || "Detailed description for this brand is coming soon...";
    
    const statsBar = document.getElementById('statsBar');
    const stats = [
        { label: 'Average Investment', value: f.avgInvestment },
        { label: 'Minimum Investment', value: f.minInvestment },
        { label: 'Min. Liquidity', value: f.liquidity || '$10,000' },
        { label: 'Year Established', value: f.year || '2017' },
        { label: 'No. of Outlets', value: f.outlets },
        { label: 'In House Financing', value: f.financing ? 'Yes' : 'No' },
        { label: 'Coaching', value: f.coaching ? 'Yes' : 'No' }
    ];

    statsBar.innerHTML = stats.map(s => `
        <div class="stat-item">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}</div>
        </div>
    `).join('');
}

function renderRandomRecommendations(all) {
    const grid = document.getElementById('randomGrid');
    // Shuffle array and take 4 random items
    const shuffled = all.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);

    grid.innerHTML = selected.map(item => `
        <div class="franchise-card">
            <div class="logo-container"><img src="${item.logo}"></div>
            <span class="cat-label">${item.category}</span>
            <h3 class="franchise-name">${item.name}</h3>
            <div class="data-row"><span>Investment</span> <strong>${item.avgInvestment}</strong></div>
            <a href="details.html?id=${item.id}" class="know-more-btn">Know More</a>
        </div>
    `).join('');
}

function openContactForm() {
    alert("Redirecting to contact form...");
    // window.location.href = 'contact.html';
}

// Optional: Scroll Reveal Animation
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.step-item').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = 'all 0.5s ease-out';
    observer.observe(item);
});