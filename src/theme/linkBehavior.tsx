import { forwardRef } from 'react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';

type LinkBehaviorProps = Omit<RouterLinkProps, 'to'> & {
  href: RouterLinkProps['to'];
};

export const LinkBehavior = forwardRef<HTMLAnchorElement, LinkBehaviorProps>(function LinkBehavior(
  props,
  ref,
) {
  const { href, ...other } = props;

  return <RouterLink ref={ref} to={href} {...other} />;
});
