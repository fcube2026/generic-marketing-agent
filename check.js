const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.$queryRawUnsafe("SELECT current_database() as db, (SELECT count(*) FROM information_schema.columns WHERE table_name='patient_profiles' AND column_name='verificationStatus')::int as has_col").then(r=>{console.log(JSON.stringify(r));process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})
