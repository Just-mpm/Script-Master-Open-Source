import { type ChangeEvent, type FormEvent, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LanguageIcon from '@mui/icons-material/Language';
import SendIcon from '@mui/icons-material/Send';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import XIcon from '@mui/icons-material/X';
import type { ReactNode } from 'react';
import { DocumentHead } from '../../components/DocumentHead';
import { alpha } from '@mui/material/styles';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { CTASection } from '../../components/public/CTASection';
import { TEXT_PRIMARY, TEXT_SECONDARY, BRAND_PRIMARY, APP_BORDER, WHITE_04, WHITE_12 } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';
import { createLogger } from '../../lib/logger';
import { useLocale } from '../../features/i18n';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Item de informação de contato exibido no painel lateral */
interface ContactInfo {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}

/** Opção do campo de assunto */
interface SelectOption {
  value: string;
  label: string;
}

/** Link de rede social */
interface SocialLink {
  label: string;
  href: string;
  icon: ReactNode;
}

/** Campos do formulário */
interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Erros de validação do formulário */
interface FormErrors {
  name: boolean;
  email: boolean;
  message: boolean;
}

// ── Constantes de dados ───────────────────────────────────────────────

/** Links das redes sociais */
const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/scriptmaster',
    icon: <InstagramIcon aria-hidden="true" />,
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@scriptmaster',
    icon: <YouTubeIcon aria-hidden="true" />,
  },
  {
    label: 'Twitter/X',
    href: 'https://x.com/scriptmaster',
    icon: <XIcon aria-hidden="true" />,
  },
] as const;

/** Estado inicial vazio do formulário */
const INITIAL_FORM: FormData = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

/** Estado inicial sem erros */
const INITIAL_ERRORS: FormErrors = {
  name: false,
  email: false,
  message: false,
};

/** Validação regex básica de email (escopo de módulo, evita recriação por render) */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Subcomponentes ────────────────────────────────────────────────────

/** Cartão individual de informação de contato com ícone, label e valor */
function ContactInfoItem({ info }: { info: ContactInfo }) {
  const Wrapper = info.href ? 'a' : 'div';
  const wrapperProps = info.href
    ? {
        href: info.href,
        target: '_blank' as const,
        rel: 'noopener noreferrer',
      }
    : {};

  return (
    <Stack
      component={Wrapper}
      {...wrapperProps}
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        p: 2,
        borderRadius: 2,
        transition: 'background-color 0.2s ease, transform 0.2s ease',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': info.href
          ? { backgroundColor: WHITE_04, transform: 'translateX(4px)' }
          : {},
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '10px',
          backgroundColor: alpha(BRAND_PRIMARY, 0.12),
          color: BRAND_PRIMARY,
          flexShrink: 0,
          '& .MuiSvgIcon-root': { fontSize: 20 },
        }}
      >
        {info.icon}
      </Box>
      <Box>
        <Typography
          variant="caption"
          component="p"
          sx={{ color: TEXT_SECONDARY, fontWeight: 500, mb: 0.25 }}
        >
          {info.label}
        </Typography>
        <Typography variant="body2" sx={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
          {info.value}
        </Typography>
      </Box>
    </Stack>
  );
}

/** Painel esquerdo com informações de contato e redes sociais */
function ContactInfoPanel() {
  const { t } = useLocale();

  // Informações de contato com labels e valores traduzidos
  const contactInfo: readonly ContactInfo[] = [
    {
      icon: <EmailIcon aria-hidden="true" />,
      label: t('contact.info.email.label'),
      value: t('contact.info.email.value'),
      href: 'mailto:contato@scriptmaster.app',
    },
    {
      icon: <AccessTimeIcon aria-hidden="true" />,
      label: t('contact.info.response.label'),
      value: t('contact.info.response.value'),
    },
    {
      icon: <LanguageIcon aria-hidden="true" />,
      label: t('contact.info.language.label'),
      value: t('contact.info.language.value'),
    },
  ];

  return (
    <Box sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 3, md: 4 }, height: '100%' })}>
      <Typography
        variant="h5"
        component="h2"
        sx={{ color: TEXT_PRIMARY, fontWeight: 700, mb: 3 }}
      >
        {t('contact.info.title')}
      </Typography>

      <Stack spacing={1} sx={{ mb: 4 }}>
        {contactInfo.map((info) => (
          <ContactInfoItem key={info.label} info={info} />
        ))}
      </Stack>

      {/* Redes sociais */}
      <Box sx={{ borderTop: `1px solid ${APP_BORDER}`, pt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: TEXT_SECONDARY, mb: 2, fontWeight: 600 }}
        >
          {t('contact.info.socials.title')}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          {SOCIAL_LINKS.map((link) => (
            <Button
              key={link.label}
              component="a"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              startIcon={link.icon}
              sx={{
                color: TEXT_SECONDARY,
                borderColor: WHITE_12,
                transition: 'color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  color: BRAND_PRIMARY,
                  borderColor: BRAND_PRIMARY,
                  backgroundColor: alpha(BRAND_PRIMARY, 0.08),
                },
              }}
            >
              {link.label}
            </Button>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

/** Formulário de contato com validação inline e fallback mailto */
function ContactForm() {
  const { t } = useLocale();
  const log = createLogger('ContactForm');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);
  const [mailtoOpened, setMailtoOpened] = useState(false);

  // Opções do select de assunto com labels traduzidos
  const subjectOptions: readonly SelectOption[] = [
    { value: 'geral', label: t('contact.subjects.general') },
    { value: 'suporte', label: t('contact.subjects.support') },
    { value: 'bugs', label: t('contact.subjects.bugs') },
    { value: 'features', label: t('contact.subjects.featureRequest') },
    { value: 'parceria', label: t('contact.subjects.partnership') },
    { value: 'outro', label: t('contact.subjects.other') },
  ];

  // Assunto padrão do mailto quando nenhum selecionado
  const defaultSubject = t('contact.defaultSubject');

  /** Atualiza campo individual do formulário */
  const handleChange = (
    field: keyof FormData,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: false }));
  };

  /** Valida campos obrigatórios e formato de email. Retorna true se tudo válido */
  const validate = (): boolean => {
    const newErrors: FormErrors = {
      name: form.name.trim().length === 0,
      email: form.email.trim().length === 0 || !EMAIL_REGEX.test(form.email.trim()),
      message: form.message.trim().length === 0,
    };
    setErrors(newErrors);
    return !newErrors.name && !newErrors.email && !newErrors.message;
  };

  /** Monta o body do mailto com dados do formulário */
  const buildMailtoBody = (): string => {
    const subject = subjectOptions.find((o) => o.value === form.subject)?.label ?? defaultSubject;
    const body = `Nome: ${form.name}%0AEmail: ${form.email}%0AAssunto: ${subject}%0A%0A${form.message}`;
    return `mailto:contato@scriptmaster.app?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  /** Submete o formulário via mailto fallback */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    window.open(buildMailtoBody(), '_blank');
    setMailtoOpened(true);
    log.info('mailto aberto', { subject: form.subject });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 3, md: 4 }, height: '100%' })}
    >
      <Typography
        variant="h5"
        component="h2"
        sx={{ color: TEXT_PRIMARY, fontWeight: 700, mb: 1 }}
      >
        {t('contact.form.title')}
      </Typography>

      <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
        {t('contact.form.alert')}
      </Alert>

      <Stack spacing={2.5}>
        {/* Nome */}
        <TextField
          fullWidth
          required
          label={t('contact.form.name')}
          placeholder={t('contact.form.namePlaceholder')}
          value={form.name}
          onChange={(e) => handleChange('name', e)}
          error={errors.name}
          helperText={errors.name ? t('contact.form.nameRequired') : ' '}
        />

        {/* Email */}
        <TextField
          fullWidth
          required
          type="email"
          label={t('contact.form.email')}
          placeholder={t('contact.form.emailPlaceholder')}
          value={form.email}
          onChange={(e) => handleChange('email', e)}
          error={errors.email}
          helperText={errors.email ? (form.email.trim().length === 0 ? t('contact.form.emailRequired') : t('contact.form.emailInvalid')) : ' '}
        />

        {/* Assunto */}
        <TextField
          select
          fullWidth
          label={t('contact.form.subject')}
          value={form.subject}
          onChange={(e) => handleChange('subject', e)}
          helperText=" "
        >
          {subjectOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Mensagem */}
        <TextField
          fullWidth
          required
          multiline
          rows={5}
          label={t('contact.form.message')}
          placeholder={t('contact.form.messagePlaceholder')}
          value={form.message}
          onChange={(e) => handleChange('message', e)}
          error={errors.message}
          helperText={errors.message ? t('contact.form.messageRequired') : ' '}
        />

        {/* Botão de envio */}
        <Button
          type="submit"
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          endIcon={<SendIcon />}
          sx={{ mt: 1 }}
        >
          {t('contact.form.submit')}
        </Button>
      </Stack>

      <Snackbar
        open={mailtoOpened}
        autoHideDuration={4000}
        onClose={() => setMailtoOpened(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 4 }}
      >
        <Alert severity="success" variant="filled" onClose={() => setMailtoOpened(false)}>
          {t('contact.form.snackbar')}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function ContactPage() {
  const { t, locale } = useLocale();

  const seo = getPageSeo({
    title: t('seo.contact.title'),
    description: t('seo.contact.description'),
    path: '/contato',
  });

  return (
    <>
      <DocumentHead {...seo} locale={locale} />
      <PageLayout>
      {/* Hero — H1 + subtítulo + CTAs */}
      <HeroSection
        title={t('contact.hero.title')}
        subtitle={t('contact.hero.subtitle')}
        primaryCta={{ label: t('contact.hero.cta'), to: '#form' }}
        secondaryCta={{ label: t('contact.hero.ctaSecondary'), to: '/precos' }}
        visual={
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <EmailIcon aria-hidden="true" sx={{ fontSize: 80, color: BRAND_PRIMARY, opacity: 0.85 }} />
          </Box>
        }
        showGlow
      />

      {/* Grid 2 colunas: Informações + Formulário */}
      <Box sx={{ pt: { xs: 8, md: 10 }, pb: { xs: 8, md: 12 } }} id="form">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <ContactInfoPanel />
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <ContactForm />
          </Grid>
        </Grid>
      </Box>

      {/* CTA Final */}
      <CTASection
        title={t('contact.cta.title')}
        subtitle={t('contact.cta.subtitle')}
        buttonLabel={t('contact.cta.button')}
        buttonHref="/cadastro"
      />
    </PageLayout>
    </>
  );
}
