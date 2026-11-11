# encoding: utf-8
# Тапсырма мәтініндегі «сен» формасындағы бұйрық етістіктерді сыпайы «сіз» формасына ауыстырады.
#   LANG=en_US.UTF-8 ruby -Eutf-8 tools/siz_form.rb assets/js/tasks-data.js assets/js/checks.js
#   (--dry — файлды өзгертпей, тек ауыстырылатын жерлерді көрсетеді)
# Сөз тек тұтас токен ретінде ауыстырылады (кирилл әрпінің ортасында емес); $…$ формулалары мен
# HTML тегтерінің ішіне тиіспейді. Сөздік әр сөздің контексті тексерілгеннен кейін құрылды:
# «ал» (жалғаулық), «жүр», «тұр» (баяндау) сияқты көп мағыналы сөздер әдейі қосылмаған.

STEMS = %w[
  тап жаз таңда сақта келтір анықта түсіндір қара оқы толықтыр толтыр ата шығар кескінде жаса
  есепте сал айналдыр негізде сыз дәлелде көрсет сәйкестендір өлше қос жалғастыр бейнеле белгіле
  бер салыстыр көшір құрастыр ойла тексер сипатта түсір байланыстыр ажырат ұсын зертте өрнекте
  аяқта орында бақыла пайдалан түрлендір теңестір бағала қой
]
EXTRA = {
  'тап' => 'табыңыз', # п → б (дауысты алдында ұяңдайды)
  'дәптеріңде' => 'дәптеріңізде', 'дәптеріңе' => 'дәптеріңізге', 'жауабыңды' => 'жауабыңызды',
  'мысалыңды' => 'мысалыңызды', 'мысалдарың' => 'мысалдарыңыз', 'ойлайсың' => 'ойлайсыз',
  'өзің' => 'өзіңіз', 'өзіңе' => 'өзіңізге', 'өзіңнің' => 'өзіңіздің'
}
L = 'А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё'
BACK = 'аоұы'; FRONT = 'әөүіе'

def polite(stem)
  last_v = stem.reverse.each_char.find { |c| (BACK + FRONT).include?(c) }
  front = last_v && FRONT.include?(last_v)
  vowel_end = (BACK + FRONT + 'уи').include?(stem[-1])
  vowel_end ? stem + (front ? 'ңіз' : 'ңыз') : stem + (front ? 'іңіз' : 'ыңыз')
end
def cap(w); w[0].upcase + w[1..-1]; end

MAP = {}
STEMS.each { |s| MAP[s] = polite(s) }
MAP.merge!(EXTRA)
MAP.keys.each { |k| MAP[cap(k)] = cap(MAP[k]) }

dry = ARGV.delete('--dry')
word_re = /(?<![#{L}])(#{MAP.keys.sort_by { |k| -k.length }.map { |k| Regexp.escape(k) }.join('|')})(?![#{L}])/
total = 0
ARGV.each do |path|
  src = File.read(path, encoding: 'utf-8')
  # $…$ (LaTeX) және <…> (HTML) бөліктерін қорғау
  parts = src.split(/(\$[^$\n]*\$|<[^>\n]*>)/)
  n = 0
  out = parts.each_with_index.map do |seg, i|
    next seg if i.odd?
    seg = seg.gsub(/(?<![#{L}])(деп|Деп) ал(?![#{L}])/) { n += 1; "#{$1} алыңыз" }
    seg.gsub(word_re) do
      w = $1; b = $~.begin(0); e = $~.end(0)
      n += 1
      ctx = seg[[0, b - 40].max...[seg.length, e + 15].min].gsub(/\s+/, ' ')
      warn "  #{w} → #{MAP[w]}   …#{ctx}…" if dry
      MAP[w]
    end
  end.join
  total += n
  warn "#{path}: #{n} ауыстыру"
  File.write(path, out) unless dry
end
warn "Барлығы: #{total}"
