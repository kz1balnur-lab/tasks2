# encoding: utf-8
# Word (.docx) → assets/js/tasks-data.js түрлендіргіші.
# Қолданылуы: ruby tools/docx2data.rb <t1 бумасы> <t2> <t3> <t4> > assets/js/tasks-data.js
# Әр аргумент — .docx файлының ашылған (unzip) бумасы.
# Мәтін, сандар, формулалар (OMML → LaTeX), кестелер мен суреттер ӨЗГЕРТІЛМЕЙ көшіріледі.
require 'rexml/document'
require 'json'

CYR = /[Ѐ-ӿ]/

# ---------- OMML → LaTeX ----------
def texify(s)
  out = ''
  i = 0
  chars = s.chars
  while i < chars.length
    c = chars[i]
    if c =~ CYR
      buf = ''
      while i < chars.length && (chars[i] =~ CYR)
        buf << chars[i]; i += 1
      end
      out << "\\text{#{buf}}"
      next
    elsif c == ' '
      n = 0
      while i < chars.length && chars[i] == ' '
        n += 1; i += 1
      end
      out << (n >= 3 ? '\\qquad ' : '\\ ')
      next
    elsif c == ',' && i > 0 && chars[i - 1] =~ /\d/ && chars[i + 1].to_s =~ /\d/
      out << '{,}'
    else
      out << case c
             when '≈' then '\\approx '
             when '·' then '\\cdot '
             when '−' then '-'
             when '×' then '\\times '
             when '³' then '^{3}'
             when '²' then '^{2}'
             when 'Δ' then '\\Delta '
             when 'ρ' then '\\rho '
             when '%' then '\\%'
             when '>' then '>'
             when '<' then '<'
             when '—' then '\\text{—}'
             when '|' then '|'
             else c
             end
    end
    i += 1
  end
  out
end

def omml(el)
  out = ''
  el.elements.each do |c|
    case c.name
    when 'r'
      t = c.elements['m:t']
      out << texify(t ? t.text.to_s : '')
    when 'sSub'
      out << "{#{omml(c.elements['m:e'])}}_{#{omml(c.elements['m:sub'])}}"
    when 'sSup'
      out << "{#{omml(c.elements['m:e'])}}^{#{omml(c.elements['m:sup'])}}"
    when 'f'
      out << "\\frac{#{omml(c.elements['m:num'])}}{#{omml(c.elements['m:den'])}}"
    when 'rad'
      out << "\\sqrt{#{omml(c.elements['m:e'])}}"
    when 'oMath', 'e', 'num', 'den', 'sub', 'sup'
      out << omml(c)
    when 'oMathParaPr', 'rPr', 'ctrlPr', 'fPr', 'sSubPr', 'sSupPr', 'radPr'
    else
      $stderr.puts "WARN: unknown OMML element #{c.name}"
      out << omml(c)
    end
  end
  out
end

def esc(s)
  s.to_s.gsub('&', '&amp;').gsub('<', '&lt;').gsub('>', '&gt;')
end

def esc_attr(s)
  esc(s).gsub('"', '&quot;')
end

# Мәтіндегі «ρ_мұз», «V_білеуше» сияқты төменгі индекстерді <sub> ретінде көрсету
def subs(html)
  html.gsub(/([A-Za-zρΔΣЀ-ӿ₀-₉])_([A-Za-z0-9Ѐ-ӿ]+)/) { "#{$1}<sub>#{$2}</sub>" }
end

# ---------- Paragraph → HTML + images ----------
class Ctx
  attr_accessor :relmap, :imgprefix
end

def run_html(r, ctx, imgs)
  rpr = r.elements['w:rPr']
  bold = rpr && rpr.elements['w:b'] && rpr.elements['w:b'].attributes['w:val'] != '0' && rpr.elements['w:b'].attributes['w:val'] != 'false'
  ital = rpr && rpr.elements['w:i'] && rpr.elements['w:i'].attributes['w:val'] != '0'
  va = rpr && rpr.elements['w:vertAlign'] ? rpr.elements['w:vertAlign'].attributes['w:val'] : nil
  s = ''
  r.each_element do |rc|
    case rc.name
    when 't' then s << esc(rc.text.to_s)
    when 'tab' then s << ' '
    when 'br' then s << '<br>'
    when 'drawing'
      REXML::XPath.each(rc, './/a:blip') do |b|
        target = ctx.relmap[b.attributes['r:embed']]
        ext = REXML::XPath.first(rc, './/wp:extent')
        w = ext ? (ext.attributes['cx'].to_i / 9525.0).round : nil
        imgs << { 't' => 'img', 'src' => "#{ctx.imgprefix}/#{File.basename(target)}", 'w' => w }
      end
    end
  end
  return '' if s.empty?
  s = "<sub>#{s}</sub>" if va == 'subscript'
  s = "<sup>#{s}</sup>" if va == 'superscript'
  s = "<b>#{s}</b>" if bold
  s = "<i>#{s}</i>" if ital
  s
end

def para_html(p, ctx, imgs)
  h = ''
  p.each_element do |c|
    case c.name
    when 'r' then h << run_html(c, ctx, imgs)
    when 'oMath' then h << "<span class=\"tex\" data-tex=\"#{esc_attr(omml(c))}\"></span>"
    when 'oMathPara'
      c.each_element('m:oMath') { |m| h << "<span class=\"tex tex-d\" data-tex=\"#{esc_attr(omml(m))}\"></span>" }
    when 'hyperlink', 'ins', 'smartTag', 'fldSimple' then h << para_html(c, ctx, imgs)
    end
  end
  h = h.gsub('</b><b>', '').gsub('</i><i>', '')
  subs(h)
end

def plain(html)
  html.gsub(/<span class="tex[^"]*" data-tex="([^"]*)"><\/span>/) { ' [' + $1 + '] ' }
      .gsub(/<[^>]+>/, '').gsub('&lt;', '<').gsub('&gt;', '>').gsub('&amp;', '&').gsub('&quot;', '"').strip
end

# Параграфты блоктар тізіміне айналдыру (мәтін + суреттер)
def para_blocks(p, ctx)
  imgs = []
  h = para_html(p, ctx, imgs)
  blocks = []
  blocks << { 't' => 'p', 'h' => h } unless plain(h).empty? && h !~ /data-tex/
  blocks.concat(imgs)
  blocks
end

def cell_blocks(tc, ctx)
  out = []
  tc.each_element do |x|
    if x.name == 'p'
      out.concat(para_blocks(x, ctx))
    elsif x.name == 'tbl'
      out << table_block(x, ctx)
    end
  end
  out
end

def table_block(tbl, ctx)
  rows = []
  tbl.each_element('w:tr') do |tr|
    row = []
    tr.each_element('w:tc') do |tc|
      pr = tc.elements['w:tcPr']
      cs = pr && pr.elements['w:gridSpan'] ? pr.elements['w:gridSpan'].attributes['w:val'].to_i : 1
      vm = nil
      if pr && pr.elements['w:vMerge']
        vm = pr.elements['w:vMerge'].attributes['w:val'] == 'restart' ? 'restart' : 'cont'
      end
      blocks = cell_blocks(tc, ctx)
      cell = { 'b' => blocks }
      cell['cs'] = cs if cs > 1
      cell['vm'] = vm if vm
      row << cell
    end
    rows << row
  end
  { 't' => 'tbl', 'rows' => rows }
end

def block_text(b)
  case b['t']
  when 'p' then plain(b['h'])
  when 'tbl' then b['rows'].map { |r| r.map { |c| c['b'].map { |x| block_text(x) }.join(' ') }.join(' | ') }.join("\n")
  when 'box' then b['b'].map { |x| block_text(x) }.join("\n")
  else ''
  end
end

def single_cell?(tb)
  tb['rows'].length == 1 && tb['rows'][0].length == 1
end

LEVEL_RE = /\A(А|В|С|A|B|C|ЕБҚБ|ЕБҚ) деңгейі\s*[—–-]\s*(\d+) балл(.*)\z/m
OBJ_RE = /\A(\d+)-оқу мақсаты:\s*(\d+\.\d+\.\d+\.\d+)\s*[—–-]\s*(.+)\z/m
LEVEL_MAP = { 'А' => 'A', 'A' => 'A', 'В' => 'B', 'B' => 'B', 'С' => 'C', 'C' => 'C', 'ЕБҚБ' => 'EBQ', 'ЕБҚ' => 'EBQ' }

def parse_topic(dir, num)
  xml = File.read(File.join(dir, 'word/document.xml'))
  rels = File.read(File.join(dir, 'word/_rels/document.xml.rels'))
  ctx = Ctx.new
  ctx.relmap = {}
  rels.scan(/<Relationship [^>]*>/) do |tag|
    id = tag[/Id="([^"]+)"/, 1]
    tg = tag[/Target="([^"]+)"/, 1]
    ctx.relmap[id] = tg
  end
  ctx.imgprefix = "assets/img/t#{num}"
  doc = REXML::Document.new(xml)
  body = doc.root.elements['w:body']

  topic = { 'id' => "t#{num}", 'num' => num, 'intro' => [], 'objectives' => [], 'sources' => [] }
  obj = nil
  task = nil
  phase = nil # :cond, :sol, :desc, :after, :teacher, :sources
  extra_n = 0

  add = lambda do |blocks|
    blocks.each do |b|
      if phase == :sources
        topic['sources'] << b
      elsif task.nil?
        (obj ? obj['preamble'] : topic['intro']) << b
      else
        case phase
        when :cond then task['condition'] << b
        when :sol, :teacher then task['solution'] << b
        when :desc, :after then task['after'] << b
        end
      end
    end
  end

  body.each_element do |el|
    if el.name == 'p'
      blocks = para_blocks(el, ctx)
      next if blocks.empty?
      txt = blocks[0]['t'] == 'p' ? plain(blocks[0]['h']) : ''
      if phase == :sources
        add.call(blocks)
      elsif txt == 'Дереккөздер'
        task = nil
        phase = :sources
      elsif (m = OBJ_RE.match(txt))
        obj = { 'id' => "t#{num}o#{m[1]}", 'n' => m[1].to_i, 'code' => m[2], 'text' => m[3].strip, 'preamble' => [], 'tasks' => [] }
        topic['objectives'] << obj
        task = nil
        phase = nil
      elsif (m = LEVEL_RE.match(txt))
        lv = LEVEL_MAP[m[1]]
        task = { 'id' => "#{obj['id']}#{lv}", 'level' => lv, 'points' => m[2].to_i, 'header' => txt,
                 'condition' => [], 'solution' => [], 'answer' => nil, 'criterion' => nil,
                 'descriptors' => nil, 'source' => nil, 'after' => [] }
        obj['tasks'] << task
        phase = :cond
      elsif txt.start_with?('Қосымша тапсырма')
        extra_n += 1
        task = { 'id' => "#{obj['id']}X", 'level' => 'EXTRA', 'points' => 0, 'header' => txt,
                 'condition' => [], 'solution' => [], 'answer' => nil, 'criterion' => nil,
                 'descriptors' => nil, 'source' => nil, 'after' => [] }
        obj['tasks'] << task
        phase = :cond
      elsif task && txt.start_with?('Оқу мақсаты:') && task['condition'].empty?
        task['objline'] = txt # t3 құжатындағы қайталанатын жол
      elsif task && txt == 'Тапсырманың шарты' && phase == :cond
        # тақырыпша — карточкада «Есептің шарты» деп көрсетіледі
      elsif task && txt =~ /\A(Можно|Можго|Может|Нужно|Надо)\s/
        # авторлың орысша ескертпесі (оқушыға арналмаған) — көрсетілмейді
        (topic['notes'] ||= []) << "#{task['id']}: #{txt}"
        $stderr.puts "NOTE #{task['id']}: авторлық ескертпе алынып тасталды: #{txt[0, 80]}"
      elsif task && txt =~ /\A\d+-тапсырма\.\s*Шешу жолы мен жауабы/
        # жаңа ЕБҚ пішімі: шешуі дескриптордан кейін жеке абзацтармен берілген
        task['teacher_answers'] = true
        task['sol_kind'] = 'steps'
        phase = :sol
      elsif task && txt.start_with?('Бағалау критерийі')
        rest = txt.sub(/\AБағалау критерийі\s*(\(дескриптор\))?\s*:?\s*/, '')
        task['criterion'] = rest unless rest.empty? || rest =~ /\A\d+ балл\z/ || rest =~ /\Aжәне дескриптор/
        task['criterion_raw'] = txt
        phase = :desc
      elsif task && (txt.start_with?('Қайдан алынған:') || txt.start_with?('Дереккөз:'))
        task['source'] = [task['source'], txt].compact.join("\n")
        task['source_html'] = [task['source_html'], blocks[0]['h']].compact.join('<br>')
      elsif task && txt == 'Мұғалімге арналған жауаптар'
        phase = :teacher
      else
        add.call(blocks)
      end
    elsif el.name == 'tbl'
      tb = table_block(el, ctx)
      first = tb['rows'][0][0]['b'][0]
      ftxt = first && first['t'] == 'p' ? plain(first['h']) : ''
      if phase == :sources
        add.call([tb])
      elsif task && ftxt == 'Шешуі және жауабы' && single_cell?(tb)
        sol = tb['rows'][0][0]['b'][1..-1]
        task['solution'].concat(sol)
        ans = sol.find { |b| b['t'] == 'p' && plain(b['h']).start_with?('Жауабы') }
        task['answer'] = ans['h'] if ans
        phase = :sol
      elsif task && phase == :teacher && single_cell?(tb)
        sol = tb['rows'][0][0]['b']
        task['solution'].concat(sol)
        task['answer'] = sol.map { |b| b['h'] }.compact.join('<br>')
        task['teacher_answers'] = true
        phase = :after
      elsif task && phase == :desc
        task['descriptors'] = tb
        phase = :after
      elsif single_cell?(tb)
        add.call([{ 't' => 'box', 'b' => tb['rows'][0][0]['b'] }])
      else
        add.call([tb])
      end
    end
  end

  # тексеру: әр тапсырмада шешу, дескриптор бар ма
  topic['objectives'].each do |o|
    o['tasks'].each do |t|
      # дескриптор кестесіндегі «Барлығы» мәнін тақырыпшадағы балмен салыстыру
      if t['descriptors']
        total_row = t['descriptors']['rows'].find { |r| r.any? { |c| c['b'].any? { |b| b['t'] == 'p' && plain(b['h']) =~ /\AБарлығы/ } } }
        tot = total_row && total_row.map { |c| c['b'].map { |b| b['t'] == 'p' ? plain(b['h']) : '' }.join }.reverse.find { |s| s =~ /\A\d+\z/ }
        unless tot
          # «Барлығы» жолы жоқ болса — балл бағанының қосындысы
          hdr = t['descriptors']['rows'][0].map { |c| c['b'].map { |b| b['t'] == 'p' ? plain(b['h']) : '' }.join }
          pi = hdr.index { |h| h =~ /\AБалл/ }
          tot = t['descriptors']['rows'][1..-1].map { |r| r[pi] && r[pi]['b'].map { |b| b['t'] == 'p' ? plain(b['h']) : '' }.join.to_i }.compact.sum.to_s if pi
        end
        if tot && tot.to_i != t['points'] && t['level'] != 'EXTRA'
          $stderr.puts "NOTE #{t['id']}: тақырыпшада #{t['points']} балл, дескриптор кестесінде #{tot} балл — кесте мәні алынды"
          (topic['notes'] ||= []) << "#{t['id']}: тақырыпшада «#{t['points']} балл», дескриптор кестесінде барлығы #{tot} балл"
          t['points_header'] = t['points']
          t['points'] = tot.to_i
        end
      end
      $stderr.puts "WARN #{t['id']}: шешуі табылмады" if t['solution'].empty?
      $stderr.puts "WARN #{t['id']}: дескриптор табылмады" if t['descriptors'].nil? && t['level'] != 'EXTRA'
      $stderr.puts "WARN #{t['id']}: «Жауабы» табылмады" if t['answer'].nil?
      $stderr.puts "WARN #{t['id']}: дереккөз табылмады" if t['source'].nil?
      $stderr.puts "WARN #{t['id']}: артық блоктар: #{t['after'].map { |b| block_text(b)[0, 60] }}" unless t['after'].empty?
      t.delete('after') if t['after'].empty?
    end
  end
  topic
end

topics = ARGV.each_with_index.map { |d, i| parse_topic(d, i + 1) }
puts '/* Автоматты түрде жасалған: tools/docx2data.rb — Word файлдарынан өзгеріссіз алынған мазмұн. Қолмен өзгертпеңіз. */'
puts 'window.PHYS_TOPICS = ' + JSON.generate(topics) + ';'
