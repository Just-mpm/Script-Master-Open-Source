import { type ChangeEvent, type FormEvent, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LanguageIcon from '@mui/icons-material/Language';
import SendIcon from '@mui/icons-material/Send';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import XIcon from '@mui/icons-material/X';
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { alpha } from '@mui/material/styles';
import { getPageSeo } from '../../lib/seo';
import { PageLayout } from '../../components/public/PageLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { CTASection } from '../../components/public/CTASection';
import { TEXT_PRIMARY, TEXT_SECONDARY, BRAND_PRIMARY, APP_BORDER, WHITE_04, WHITE_12 } from '../../theme/tokens';
import { glassPanelSx } from '../../theme/surfaces';

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

/** Informações de contato exibidas na coluna esquerda */
const CONTACT_INFO: readonly ContactInfo[] = [
  {
    icon: <EmailIcon />,
    label: 'Email',
    value: 'contato@scriptmaster.app',
    href: 'mailto:contato@scriptmaster.app',
  },
  {
    icon: <AccessTimeIcon />,
    label: 'Resposta',
    value: 'Em até 24h úteis',
  },
  {
    icon: <LanguageIcon />,
    label: 'Idioma',
    value: 'Português (Brasil)',
  },
] as const;

/** Opções do select de assunto */
const SUBJECT_OPTIONS: readonly SelectOption[] = [
  { value: 'geral', label: 'Dúvida geral' },
  { value: 'suporte', label: 'Suporte técnico' },
  { value: 'bugs', label: 'Reportar um bug' },
  { value: 'features', label: 'Sugestão de funcionalidade' },
  { value: 'parceria', label: 'Parceria comercial' },
  { value: 'outro', label: 'Outro assunto' },
] as const;

/** Links das redes sociais */
const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/scriptmaster',
    icon: <InstagramIcon />,
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com/@scriptmaster',
    icon: <YouTubeIcon />,
  },
  {
    label: 'Twitter/X',
    href: 'https://x.com/scriptmaster',
    icon: <XIcon />,
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

/** Mensagem base do mailto — assunto padrão quando nenhum selecionado */
const DEFAULT_SUBJECT = 'Contato via Site';

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
        transition: 'background-color 0.2s ease',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': info.href
          ? { backgroundColor: WHITE_04 }
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
  return (
    <Box sx={(theme) => ({ ...glassPanelSx(theme), p: { xs: 3, md: 4 }, height: '100%' })}>
      <Typography
        variant="h5"
        component="h2"
        sx={{ color: TEXT_PRIMARY, fontWeight: 700, mb: 3 }}
      >
        Informações de contato
      </Typography>

      <Stack spacing={1} sx={{ mb: 4 }}>
        {CONTACT_INFO.map((info) => (
          <ContactInfoItem key={info.label} info={info} />
        ))}
      </Stack>

      {/* Redes sociais */}
      <Box sx={{ borderTop: `1px solid ${APP_BORDER}`, pt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: TEXT_SECONDARY, mb: 2, fontWeight: 600 }}
        >
          Siga nas redes sociais
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
              startIcon={link.icon}
              sx={{
                color: TEXT_SECONDARY,
                borderColor: WHITE_12,
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
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);

  /** Atualiza campo individual do formulário */
  const handleChange = (
    field: keyof FormData,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: false }));
  };

  /** Valida campos obrigatórios e retorna true se tudo válido */
  const validate = (): boolean => {
    const newErrors: FormErrors = {
      name: form.name.trim().length === 0,
      email: form.email.trim().length === 0,
      message: form.message.trim().length === 0,
    };
    setErrors(newErrors);
    return !newErrors.name && !newErrors.email && !newErrors.message;
  };

  /** Monta o body do mailto com dados do formulário */
  const buildMailtoBody = (): string => {
    const subject = SUBJECT_OPTIONS.find((o) => o.value === form.subject)?.label ?? DEFAULT_SUBJECT;
    const body = `Nome: ${form.name}%0AEmail: ${form.email}%0AAssunto: ${subject}%0A%0A${form.message}`;
    return `mailto:contato@scriptmaster.app?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  /** Submete o formulário via mailto fallback */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    window.location.href = buildMailtoBody();
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
        sx={{ color: TEXT_PRIMARY, fontWeight: 700, mb: 3 }}
      >
        Envie uma mensagem
      </Typography>

      <Stack spacing={2.5}>
        {/* Nome */}
        <TextField
          fullWidth
          required
          label="Seu nome"
          placeholder="João da Silva"
          value={form.name}
          onChange={(e) => handleChange('name', e)}
          error={errors.name}
          helperText={errors.name ? 'Nome é obrigatório' : ' '}
        />

        {/* Email */}
        <TextField
          fullWidth
          required
          type="email"
          label="Seu email"
          placeholder="joao@exemplo.com"
          value={form.email}
          onChange={(e) => handleChange('email', e)}
          error={errors.email}
          helperText={errors.email ? 'Email é obrigatório' : ' '}
        />

        {/* Assunto */}
        <TextField
          select
          fullWidth
          label="Assunto"
          value={form.subject}
          onChange={(e) => handleChange('subject', e)}
          helperText=" "
        >
          {SUBJECT_OPTIONS.map((option) => (
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
          label="Sua mensagem"
          placeholder="Descreva sua dúvida, sugestão ou problema..."
          value={form.message}
          onChange={(e) => handleChange('message', e)}
          error={errors.message}
          helperText={errors.message ? 'Mensagem é obrigatória' : ' '}
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
          Enviar mensagem
        </Button>
      </Stack>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function ContactPage() {
  const seo = getPageSeo({
    title: 'Contato',
    description: 'Entre em contato com a equipe do Script Master. Estamos aqui para ajudar.',
    path: '/contato',
  });

  return (
    <>
      <Helmet {...seo} />
      <PageLayout>
      {/* Hero — H1 + subtítulo + CTAs */}
      <HeroSection
        title="Fale Conosco"
        subtitle="Estamos aqui para ajudar. Envie sua dúvida, sugestão ou reporte um problema e responderemos em até 24h úteis."
        primaryCta={{ label: 'Enviar mensagem', to: '#form' }}
        secondaryCta={{ label: 'Ver preços', to: '/precos' }}
        visual={
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <EmailIcon sx={{ fontSize: 80, color: BRAND_PRIMARY, opacity: 0.85 }} />
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
        title="Pronto para começar?"
        subtitle="Crie sua primeira narração gratuitamente. Sem compromisso, sem cartão."
        buttonLabel="Entrar com Google"
        buttonHref="/login"
      />
    </PageLayout>
    </>
  );
}
