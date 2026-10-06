/* Roteador da prévia de página única: mostra a seção da rota e ativa filtros/busca. */
;(function () {
  var sections = {}
  document.querySelectorAll('[data-route]').forEach(function (s) {
    sections[s.getAttribute('data-route')] = s
  })
  var current = { path: '/', query: '' }
  var cleanups = []

  function parse(href) {
    var anchor = ''
    var hashAt = href.indexOf('#')
    if (hashAt >= 0) {
      anchor = href.slice(hashAt + 1)
      href = href.slice(0, hashAt)
    }
    var q = href.indexOf('?')
    var path = q >= 0 ? href.slice(0, q) : href
    var query = q >= 0 ? href.slice(q + 1) : ''
    if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1)
    return { path: path || '/', query: query, anchor: anchor }
  }

  function writeHash(replace) {
    var hash = '#' + current.path + (current.query ? '?' + current.query : '')
    try {
      if (replace) history.replaceState(null, '', hash)
      else history.pushState(null, '', hash)
    } catch {
      // history indisponível: segue só em memória
    }
  }

  var location = {
    pathname: function () {
      return current.path
    },
    getParams: function () {
      return new URLSearchParams(current.query)
    },
    setParams: function (params) {
      current.query = params.toString()
      writeHash(true)
    },
    go: function (href) {
      navigate(href)
    },
  }

  function show(target, push) {
    var section = sections[target.path] || sections['/404'] || sections['/']
    cleanups.forEach(function (fn) {
      fn()
    })
    Object.keys(sections).forEach(function (key) {
      sections[key].hidden = sections[key] !== section
    })
    current = { path: sections[target.path] ? target.path : '/', query: target.query }
    if (push !== null) writeHash(!push)
    cleanups = [Portal.enhanceChrome(location), Portal.enhanceAll(section, location)]
    var titleNode = section.querySelector('[data-route-title]')
    if (titleNode) document.title = titleNode.getAttribute('data-route-title')
    var el = target.anchor && section.querySelector('#' + CSS.escape(target.anchor))
    if (el) el.scrollIntoView()
    else if (!new URLSearchParams(target.query).get('professor')) window.scrollTo(0, 0)
  }

  function navigate(href) {
    show(parse(href), true)
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]')
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return
    var href = a.getAttribute('href')
    if (href.charAt(0) === '/') {
      e.preventDefault()
      var dialog = document.querySelector('dialog[open]')
      if (dialog) dialog.close()
      navigate(href)
    } else if (href.charAt(0) === '#' && href.length > 1) {
      e.preventDefault()
      var section = sections[current.path]
      var el = section && section.querySelector('#' + CSS.escape(href.slice(1)))
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  })

  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return
    var form = e.target
    if (form.getAttribute('action') === '/busca') {
      e.preventDefault()
      var input = form.querySelector('input[name="q"]')
      navigate('/busca' + (input && input.value.trim() ? '?q=' + encodeURIComponent(input.value.trim()) : ''))
    }
  })

  window.addEventListener('popstate', function () {
    show(parse(window.location.hash.slice(1) || '/'), null)
  })

  var initial = window.location.hash.slice(1)
  show(parse(initial && initial.charAt(0) === '/' ? initial : '/'), false)
})()
