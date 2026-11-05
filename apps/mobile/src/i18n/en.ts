/** English strings. Add `ml.ts` with the same keys for Malayalam. */
export const en = {
  'common.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong',
  'common.offline': "Can't reach Way2meal. Check your connection.",

  'login.title': 'Welcome to Way2meal',
  'login.subtitle': 'High-protein meals, delivered.',
  'login.phone': 'Mobile number',
  'login.sendCode': 'Send code',
  'login.code': 'Enter the 6-digit code',
  'login.codeSentTo': 'Code sent to {phone}',
  'login.verify': 'Continue',
  'login.changeNumber': 'Change number',
  'login.invalidCode': 'Enter the 6-digit code',

  'onboarding.title': 'Tell us about you',
  'onboarding.name': 'Your name',
  'onboarding.email': 'Email (optional)',
  'onboarding.diet': 'Dietary note (optional)',
  'onboarding.dietPlaceholder': 'e.g. no peanuts',
  'onboarding.save': 'Get started',
  'onboarding.nameRequired': 'Please enter your name',

  'tabs.home': 'Home',
  'tabs.menu': 'Menu',
  'tabs.plan': 'My Plan',
  'tabs.orders': 'Orders',
  'tabs.profile': 'Profile',

  'home.greeting': 'Hi {name}',
  'home.today': "Today's meals",
  'home.holiday': 'Holiday: {reason}',
  'home.noMenu': 'Menu not set yet',
  'home.cutoffIn': 'Changes close in {time}',
  'home.cutoffPassed': 'Closed for changes today',
  'home.noPlan': 'Subscribe to get this meal delivered',

  'slot.LUNCH': 'Lunch',
  'slot.DINNER': 'Dinner',

  'menu.title': 'Weekly menu',
  'menu.thisWeek': 'This week',
  'menu.nextWeek': 'Next week',
  'menu.today': 'Today',
  'menu.special': 'Special',
  'menu.closed': 'Closed',
  'menu.badge': '{protein} g+ protein · {kcal} kcal',

  'soon.plan': 'Plans, skips and your delivery calendar arrive in the next update.',
  'soon.orders': 'Your orders and payments will appear here.',

  'profile.phone': 'Phone',
  'profile.support': 'Chat with us on WhatsApp',
  'profile.logout': 'Log out',
  'weekday.1': 'Mon',
  'weekday.2': 'Tue',
  'weekday.3': 'Wed',
  'weekday.4': 'Thu',
  'weekday.5': 'Fri',
  'weekday.6': 'Sat',
  'weekday.7': 'Sun',
} as const;

export type MessageKey = keyof typeof en;
