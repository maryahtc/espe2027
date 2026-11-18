// Modo de simulação (Admin vendo o portal como aluno): entrar, registrar caso, planejar, Minha Produção e Workflows
// no rascunho — nada gravado no banco nem no Storage —, faixa visível e saída. Banco LOCAL.
import { fingerprint, go, launch, login, one, people, pickStep, suite } from '../lib.mjs'

const t = suite('Simulação')
let browser
try {
  await people('sim.local')
  browser = await launch()
  const ad = await login(browser, 'admin@sim.local')
  const FP0 = fingerprint()

  await go(ad, '/admin/simulacao')
  await ad.locator('[data-turma="turma-2027"] button').click()
  await ad.waitForURL((x) => !x.href.includes('/admin/simulacao'), { timeout: 20000 }).catch(() => {})
  await go(ad, '/')
  t.check('Aluno simulado começa pelo aceite do termo (só no rascunho)', ad.url().includes('/termo'))
  if (ad.url().includes('/termo')) {
    await ad.locator('input[name=aceito]').check()
    await ad.locator('button:has-text("Aceitar e continuar")').click()
    await ad.waitForURL((x) => !x.href.includes('/termo'), { timeout: 20000 }).catch(() => {})
  }
  await ad.waitForLoadState('networkidle')
  t.check('Simulação ativa com a faixa visível', (await ad.locator('[data-simulacao-faixa]').count()) === 1)
  const cookies = async () => (await ad.context().cookies()).filter((c) => c.name.startsWith('portal_simulacao'))
  t.check('Rascunho guardado em cookie cifrado', (await cookies()).length > 0)

  // Registrar um caso no rascunho
  await go(ad, '/casos/novo')
  const f = ad.locator('form[data-registro]')
  await f.locator('#paciente').fill('S.I.M.')
  await f.locator('[role=radio]:has-text("Por procedimento")').click()
  await pickStep(f, 'mock', 'Mock-up')
  await f.locator('button[type=submit]').click()
  await ad.waitForURL(/\/casos\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {})
  await ad.waitForLoadState('networkidle')
  const simCase = ad.url().split('?')[0].split('#')[0].split('/').pop()
  t.check('Caso do rascunho abre com a jornada', (await ad.locator('[data-jornada] [data-registro]').count()) === 1)
  t.check('Nada foi gravado no banco (nem caso, nem registro)', one("select count(*) from clinical_cases where patient_label='S.I.M.'") === '0')

  // Planejar no rascunho
  await go(ad, `/casos/${simCase}/planejamento/nova`)
  const pf = ad.locator('form[data-editor-plano]')
  await pf.locator('[data-composer] [role=radio]:has-text("Por procedimento")').click()
  await pickStep(pf, 'ajuste', 'Ajuste oclusal')
  await pf.locator('[data-salvar-plano]').click()
  await ad.waitForURL((x) => !x.href.includes('/planejamento/'), { timeout: 20000 }).catch(() => {})
  await ad.waitForLoadState('networkidle')
  t.check('Planejamento funciona no rascunho', (await ad.locator('[data-plano-consulta]').count()) === 1)

  // Minha Produção com os números do rascunho
  await go(ad, '/producao')
  t.check('Minha Produção mostra os números do rascunho (1 experiência)', (await ad.locator('[data-indicador="experiencias"] [data-valor]').innerText()).trim() === '1')
  t.check('Workflows clínicos abre na Simulação', (await go(ad, '/workflows')) === 200)
  t.check('Banco e Storage idênticos depois de tudo isso', fingerprint() === FP0)

  // Sair
  await ad.locator('[data-sair-simulacao]').first().click()
  await ad.waitForTimeout(1500)
  await ad.waitForLoadState('networkidle')
  t.check('Sair da simulação apaga o rascunho (cookie) e volta ao Admin', (await cookies()).length === 0 && ad.url().includes('/admin'))
  t.check('Fora da simulação, Admin não usa as páginas do aluno', (await go(ad, '/casos'), ad.url().includes('/admin/simulacao')))
  t.check('Nada gravado ao sair', fingerprint() === FP0)
} catch (e) {
  t.fail(e)
} finally {
  await browser?.close()
  t.finish()
}
