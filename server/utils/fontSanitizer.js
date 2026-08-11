/**
 * Module xử lý và làm sạch lỗi mã hóa font UTF-8 (Mojibake / Double UTF-8 Encoding)
 */

export function fixUtf8Encoding(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') return inputStr || '';

  let str = inputStr;

  // 1. Khôi phục các chuỗi bị mã hóa đúp Mojibake (Double UTF-8 / Latin1 -> UTF8 mismatch)
  try {
    if (/[\Ã\Â\Ä\Ê\Ì\Í\Ò\Ó\Ô\Õ\Ö\Ù\Ú\Û\Ü\à\á\â\ã\ä\å\æ\ç\è\é\ê\ë\ì\í\î\ï]/.test(str)) {
      const decoded = Buffer.from(str, 'binary').toString('utf8');
      if (!decoded.includes('\uFFFD') && decoded.length < str.length) {
        str = decoded;
      }
    }
  } catch (e) {
    // Giữ nguyên chuỗi nếu không giải mã được
  }

  // 2. Thay thế triệt để các chuỗi lỗi font cụ thể hay gặp trong bài viết Facebook
  str = str
    .replace(/Â¦/g, '')
    .replace(/THÃªM/gi, '')
    .replace(/Â/g, '')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã²/g, 'ò')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã­/g, 'í')
    .replace(/Ã¬/g, 'ì')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã¹/g, 'ù')
    .replace(/Ã½/g, 'ý')
    .replace(/Ã°/g, 'đ')
    .replace(/Ã/g, '')
    .replace(/¦/g, '')
    .replace(/…/g, ' ');

  // 3. Loại bỏ các ký tự rác không in được (Control Characters) trừ dấu xuống dòng
  str = str.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 4. Chuẩn hóa khoảng trắng thừa
  return str.replace(/[ \t]+/g, ' ').trim();
}

/**
 * Xóa quảng cáo / tên miền rác trên tiêu đề bài viết
 */
export function cleanTitleText(titleStr) {
  let cleaned = fixUtf8Encoding(titleStr);
  if (!cleaned) return '';

  cleaned = cleaned
    .replace(/\b(full\s*video|full\s*movie|full\s*clip|official\s*video)\b/gi, '')
    .replace(/\b(https?|ftp):\/\/\S+/gi, '')
    .replace(/\b[a-zA-Z0-9-]+\.(com|net|org|co|info|news|nows|xyz|online|site|tv|me)\b/gi, '')
    .replace(/\b(xem\s*thê\s*m|xem\s*them|see\s*more|read\s*more|click\s*here)\b/gi, '')
    .replace(/[-_.:|]{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}
