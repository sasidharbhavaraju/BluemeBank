(function(){
  var navToggle = document.getElementById('navToggle');
  var pageNav = document.getElementById('pageNav') || document.querySelector('.page-nav');
  if(navToggle && pageNav){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      pageNav.classList.toggle('open');
    });
    pageNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        if(pageNav.classList.contains('open')){
          pageNav.classList.remove('open');
          navToggle.setAttribute('aria-expanded','false');
        }
      });
    });
  }
})();