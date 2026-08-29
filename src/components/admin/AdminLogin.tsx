/**
 * Admin Login page — email/password with forgot-password flow.
 */
import { useState, useCallback, type FormEvent } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ArrowRight, KeyRound, CheckCircle, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './AdminLogin.css';

export default function AdminLogin() {
  const { user, loading, login, resetPassword, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Rate limiting: lock after 5 failed attempts for 60 seconds
  const MAX_ATTEMPTS = 5;

  const handleLogin = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (locked || isSubmitting) return;
    clearError();

    setIsSubmitting(true);
    try {
      await login(email, password);
      setAttempts(0);
      navigate('/admin', { replace: true });
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setTimeout(() => {
          setLocked(false);
          setAttempts(0);
        }, 60_000);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, login, clearError, attempts, locked, isSubmitting, navigate]);

  const handleForgotPassword = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (resetSubmitting) return;

    setResetSubmitting(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      // Error is handled by context
    } finally {
      setResetSubmitting(false);
    }
  }, [resetEmail, resetPassword, resetSubmitting]);

  // Already logged in → go to dashboard
  if (!loading && user) {
    return <Navigate to="/admin" replace />;
  }

  if (loading) {
    return (
      <div className="admin-login">
        <div className="admin-login__loading">
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login">
      {/* Decorative background */}
      <div className="admin-login__bg">
        <div className="admin-login__bg-gradient" />
        <div className="admin-login__bg-pattern" />
      </div>

      <div className="admin-login__card animate-fade-in-up">
        {/* Logo / Brand */}
        <div className="admin-login__brand">
          <div className="admin-login__icon">
            <KeyRound size={28} />
          </div>
          <h1 className="admin-login__title">LUXE A&P</h1>
          <p className="admin-login__subtitle">Painel Administrativo</p>
        </div>

        {/* Forgot Password View */}
        {showForgot ? (
          <div className="admin-login__forgot">
            {resetSent ? (
              <div className="admin-login__reset-success animate-fade-in-up">
                <CheckCircle size={40} className="admin-login__success-icon" />
                <h3>Verifique seu E-mail</h3>
                <p>
                  Se existir uma conta cadastrada para <strong>{resetEmail}</strong>,
                  o link de redefinição de senha foi enviado.
                </p>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '1.5rem' }}
                  onClick={() => {
                    setShowForgot(false);
                    setResetSent(false);
                    setResetEmail('');
                  }}
                >
                  <ArrowLeft size={16} />
                  Voltar para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h3 className="admin-login__forgot-title">Redefinir Senha</h3>
                <p className="admin-login__forgot-desc">
                  Digite seu e-mail para enviarmos um link de redefinição de senha.
                </p>

                <div className="admin-login__field">
                  <label className="admin-login__label" htmlFor="reset-email">
                    <Mail size={16} />
                    E-mail
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    className="admin-login__input"
                    placeholder="admin@luxeapcleaning.com"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="admin-login__error">{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg admin-login__btn"
                  disabled={resetSubmitting || !resetEmail}
                >
                  {resetSubmitting ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Link de Redefinição
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="admin-login__link"
                  onClick={() => {
                    setShowForgot(false);
                    clearError();
                  }}
                >
                  <ArrowLeft size={14} />
                  Voltar para o Login
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="admin-login__form">
            <div className="admin-login__field">
              <label className="admin-login__label" htmlFor="login-email">
                <Mail size={16} />
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                className="admin-login__input"
                placeholder="admin@luxeapcleaning.com"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError(); }}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="admin-login__field">
              <label className="admin-login__label" htmlFor="login-password">
                <Lock size={16} />
                Senha
              </label>
              <div className="admin-login__password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="admin-login__input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-login__toggle-pw"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="admin-login__error">{error}</p>}

            {locked && (
              <p className="admin-login__locked">
                Muitas tentativas incorretas. Aguarde 60 segundos.
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg admin-login__btn"
              disabled={isSubmitting || locked || !email || !password}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner spinner-sm" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <p className="admin-login__attempts">
                {MAX_ATTEMPTS - attempts} tentativa{MAX_ATTEMPTS - attempts > 1 ? 's' : ''} restante{MAX_ATTEMPTS - attempts > 1 ? 's' : ''}
              </p>
            )}

            <button
              type="button"
              className="admin-login__link"
              onClick={() => {
                setShowForgot(true);
                setResetEmail(email);
                clearError();
              }}
            >
              Esqueceu sua senha?
            </button>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <Link
                to="/"
                className="admin-login__link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Home size={14} />
                <span>Voltar ao Site</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
