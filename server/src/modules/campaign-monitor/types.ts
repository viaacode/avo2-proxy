export type NewsletterList = 'newsletter' | 'ambassador' | 'workshop';

export interface NewsletterPreferences {
	newsletter: boolean;
	workshop: boolean;
	ambassador: boolean;
}
