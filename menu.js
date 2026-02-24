// slider menu toggle shared by all pages

document.addEventListener('DOMContentLoaded', ()=>{
    const toggle = document.getElementById('menuToggle');
    const slider = document.getElementById('sliderNav');
    if(!toggle || !slider) return;
    toggle.addEventListener('click', ()=>{
        slider.classList.toggle('open');
    });
    // close when clicking outside
    document.addEventListener('click', e=>{
        if(!slider.contains(e.target) && !toggle.contains(e.target)){
            slider.classList.remove('open');
        }
    });
});
