pub fn calculate_entropy(block: &[u8]) -> f64 {
    let n = block.len();
    if n == 0 {
        return 0.0;
    }

    let mut counts = [0_u32; 256];
    for &b in block {
        counts[b as usize] += 1;
    }

    let inv_ln2 = 1.4426950408889634;
    let mut sum_c_log_c = 0.0;

    for &count in &counts {
        if count > 0 {
            let c = count as f64;
            sum_c_log_c += c * (c.ln() * inv_ln2);
        }
    }

    let log2_n = (n as f64).ln() * inv_ln2;
    let entropy = log2_n - (sum_c_log_c / (n as f64));
    
    entropy.max(0.0)
}
