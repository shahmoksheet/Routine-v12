export const translations = {
  en: {
    home: 'Home',
    tasks: 'Tasks',
    schedule: 'Schedule',
    chat: 'Chat',
    settings: 'Settings',
    messages: 'Messages',
    routine_ai: 'Routine AI',
    team_chat: 'Team Chat',
    search: 'Search...',
    groups: 'Groups',
    direct_messages: 'Direct Messages',
    type_message: 'Type a message...',
    ask_routine: 'Ask Routine AI...'
  },
  hi: {
    home: 'होम',
    tasks: 'कार्य',
    schedule: 'अनुसूची',
    chat: 'चैट',
    settings: 'सेटिंग्स',
    messages: 'संदेश',
    routine_ai: 'रूटीन एआई',
    team_chat: 'टीम चैट',
    search: 'खोजें...',
    groups: 'समूह',
    direct_messages: 'सीधे संदेश',
    type_message: 'एक संदेश टाइप करें...',
    ask_routine: 'रूटीन एआई से पूछें...'
  },
  gu: {
    home: 'ઘર',
    tasks: 'કાર્યો',
    schedule: 'અનુસૂચિ',
    chat: 'ચેટ',
    settings: 'સેટિંગ્સ',
    messages: 'સંદેશાઓ',
    routine_ai: 'રૂટિન એઆઈ',
    team_chat: 'ટીમ ચેટ',
    search: 'શોધો...',
    groups: 'જૂથો',
    direct_messages: 'સીધા સંદેશાઓ',
    type_message: 'સંદેશ લખો...',
    ask_routine: 'રૂટિન એઆઈ ને પૂછો...'
  },
  mr: {
    home: 'मुख्यपृष्ठ',
    tasks: 'कार्ये',
    schedule: 'वेळापत्रक',
    chat: 'चॅट',
    settings: 'सेटिंग्ज',
    messages: 'संदेश',
    routine_ai: 'रुटीन एआय',
    team_chat: 'टीम चॅट',
    search: 'शोधा...',
    groups: 'गट',
    direct_messages: 'थेट संदेश',
    type_message: 'संदेश टाइप करा...',
    ask_routine: 'रुटीन एआय ला विचारा...'
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
