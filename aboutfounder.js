document.addEventListener('DOMContentLoaded', () => {
    const founderSection = document.querySelector('.about-founder');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    // Set initial state
    founderSection.style.opacity = '0';
    founderSection.style.transform = 'translateY(30px)';
    founderSection.style.transition = 'all 0.8s ease-out';
    
    observer.observe(founderSection);
});