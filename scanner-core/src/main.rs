use clap::Parser;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};

mod entropy;
mod db;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(short, long)]
    image: String,

    #[arg(short, long)]
    db: String,

    #[arg(short, long, default_value_t = 4096)]
    block_size: usize,
}

fn encode_hex(bytes: &[u8]) -> String {
    let hex_chars = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        s.push(hex_chars[(b >> 4) as usize] as char);
        s.push(hex_chars[(b & 0xf) as usize] as char);
    }
    s
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    let mut database = db::Database::new(&args.db)?;
    let metadata = std::fs::metadata(&args.image)?;
    let total_size = metadata.len();
    let total_blocks = (total_size as usize / args.block_size) as i64;

    let scan_id = database.create_scan(&args.image, total_blocks)?;

    let mut file = File::open(&args.image)?;
    let mut buffer = vec![0u8; args.block_size];

    database.begin_transaction()?;

    for block_idx in 0..total_blocks {
        let offset = block_idx as u64 * args.block_size as u64;
        file.seek(SeekFrom::Start(offset))?;
        
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }

        let current_block = &buffer[..bytes_read];
        let ent = entropy::calculate_entropy(current_block);

        let is_deleted = ent > 7.5 || (ent > 0.0 && ent < 5.0);
        let hex_preview = encode_hex(&current_block[..std::cmp::min(32, bytes_read)]);

        database.insert_block(
            scan_id,
            offset as i64,
            block_idx,
            ent,
            is_deleted,
            &hex_preview,
        )?;
    }

    database.commit_transaction()?;
    database.complete_scan(scan_id)?;

    println!("[+] Scan completed successfully for scan_id: {}", scan_id);

    Ok(())
}