// GSAP Hero Ultra-Premium Animation
document.addEventListener('DOMContentLoaded', () => {
    const words = document.querySelectorAll('.premium-word');
    
    // Fragmentar texto por letras
    words.forEach(wordDiv => {
        const text = wordDiv.getAttribute('data-word');
        wordDiv.innerHTML = text.split('').map(char => `<span>${char}</span>`).join('');
    });

    const mainTl = gsap.timeline({ repeat: -1 });

    words.forEach((word) => {
        const chars = word.querySelectorAll('span');
        
        mainTl.set(word, { opacity: 1 })
        .fromTo(chars, 
            { 
                y: 100, 
                opacity: 0, 
                rotateX: -90, 
                filter: "blur(20px)" 
            }, 
            { 
                y: 0, 
                opacity: 1, 
                rotateX: 0, 
                filter: "blur(0px)",
                duration: 0.8, 
                stagger: 0.05, 
                ease: "expo.out" 
            }
        )
        .to(chars, 
            { 
                y: -100, 
                opacity: 0, 
                rotateX: 90, 
                filter: "blur(20px)",
                duration: 0.6, 
                stagger: 0.03, 
                ease: "expo.in" 
            }, 
            "+=1.2"
        )
        .set(word, { opacity: 0 });
    });
});
