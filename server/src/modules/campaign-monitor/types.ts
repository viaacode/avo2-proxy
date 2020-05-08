// TODO: Implement in typings
export interface NewsletterPreferences {
	newsletter: boolean;
	workshop: boolean;
	ambassador: boolean;
}

export type NewsletterKey = keyof NewsletterPreferences;
