import { useEffect, useRef, useState } from 'react';

/**
 * Hook that triggers a CSS class when an element enters the viewport.
 * Uses IntersectionObserver for performant scroll-driven animations.
 */
export function useScrollReveal<T extends HTMLElement>(
  threshold = 0.15
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => {
      observer.unobserve(node);
    };
  }, [threshold]);

  return [ref, isVisible];
}

export default useScrollReveal;
